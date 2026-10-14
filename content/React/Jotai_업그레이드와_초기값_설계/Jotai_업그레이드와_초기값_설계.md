---
title: "Jotai v2에서 v3로: 사라진 재렌더 한 줄과 초기값 설계"
date: "2026-10-14"
description: "Jotai의 버전별 구독 구현을 비교하고, 브라우저에 저장된 값을 이펙트로 복원할 때 생기는 타이밍 문제와 SSR 초기값 설계를 정리했습니다."
tag: ["React", "Jotai", "상태 관리", "SSR", "useSyncExternalStore"]
category: "React"
---

상태 관리 라이브러리를 업그레이드할 때는 API 변경과 타입 에러부터 확인하기 쉽습니다. 하지만 API가 그대로여도 값을 읽고 구독하는 시점이 달라지면 화면의 동작이 바뀔 수 있습니다.

Jotai 2.20.3과 3.0.0의 `useAtomValue` 구현을 비교하면서 눈에 들어온 것도 그런 차이였습니다. v2에 있던 구독 직후의 갱신 호출이 v3에서는 사라져 있었습니다. 짧은 코드 차이였지만, 브라우저에 저장된 값을 마운트 후 atom에 복사하는 구조를 다시 생각하게 했습니다.

이 글에서는 **테마 설정을 복원하는 별도의 예제**로 문제를 설명합니다. 아래 애플리케이션 코드는 설명을 위해 새로 작성했으며, 특정 서비스의 구현이나 적용 결과를 옮긴 것이 아닙니다. 비교 대상은 Jotai **2.20.3과 3.0.0**입니다.

## 1. 값은 저장돼 있는데 화면은 초기값을 읽는 상황

브라우저 저장소에 사용자가 선택한 테마가 있고, 여러 컴포넌트가 그 값을 함께 사용한다고 가정하겠습니다.

구조를 단순하게 시작하면 다음과 같습니다.

```text
localStorage의 테마 설정
        ↓ 마운트 후 복원
     themeAtom
        ↓
설정 버튼 · 미리보기 · 테마 라벨
```

atom의 초기값은 `light`입니다. 저장된 설정을 복원하는 컴포넌트가 마운트되면 `localStorage`를 읽어 atom을 갱신합니다.

```tsx
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useLayoutEffect } from 'react';

type Theme = 'light' | 'dark';
const themeAtom = atom<Theme>('light');

function RestoreTheme() {
  const setTheme = useSetAtom(themeAtom);

  useLayoutEffect(() => {
    const saved = localStorage.getItem('demo-theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    }
  }, [setTheme]);

  return null;
}

function ThemeLabel() {
  const theme = useAtomValue(themeAtom);
  return <span>{theme}</span>;
}
```

이 코드를 읽을 때는 “복원 함수가 실행되는가”뿐 아니라 **화면이 값을 읽는 시점과 변경 통지를 구독하는 시점 사이에 무엇이 일어나는가**를 봐야 합니다.

구독 전에 atom이 바뀌는 경우, 저장소에는 새 값이 있어도 이미 초기값을 읽은 컴포넌트가 그 변경을 통지받지 못할 수 있습니다.

## 2. v2에서 있었던 한 번의 재확인

Jotai 2.20.3의 `useAtomValue`에는 구독을 등록한 뒤 `rerender()`를 호출하는 코드가 있습니다. 비동기 값과 옵션 처리를 생략하면 핵심은 다음과 같습니다.

```tsx
// Jotai 2.20.3 — 구독 부분을 축약한 코드
useEffect(() => {
  const unsubscribe = store.sub(atom, rerender);
  rerender();
  return unsubscribe;
}, [store, atom]);
```

이 호출로 구독 시점의 값을 다시 확인할 기회가 생깁니다. 렌더 이후 구독 이전에 값이 바뀌었다면 그 차이를 읽을 수 있습니다. [Jotai 2.20.3 소스](https://github.com/pmndrs/jotai/blob/v2.20.3/src/react/useAtomValue.ts)

여기서 `rerender()`가 호출된다는 것과 DOM이 반드시 한 번 더 갱신된다는 것은 구분해야 합니다. 같은 구현의 reducer는 기존 값과 새 값이 같으면 이전 상태를 반환합니다. 따라서 이 코드를 “모든 컴포넌트가 무조건 한 번 더 화면을 그린다”라고 설명하면 부정확합니다.

Jotai 3.0.0에서 `useAtomValue`가 사용하는 `useAtomValueRaw`의 구독 부분은 다음과 같습니다.

```tsx
// Jotai 3.0.0
useEffect(() => store.sub(atom, rerender), [store, atom]);
```

구독 직후의 별도 갱신 호출이 없습니다. 구독 등록 전에 끝난 변경을 이 줄 자체가 다시 확인하지는 않습니다. [Jotai 3.0.0 소스](https://github.com/pmndrs/jotai/blob/v3.0.0/src/react/useAtomValueRaw.ts)

이 차이가 문제가 되는 조건을 순서로 풀어보면 다음과 같습니다.

| 순서 | 읽는 컴포넌트 | 저장소 |
| --- | --- | --- |
| 렌더 | 초기값 `light`를 읽음 | `light` |
| 구독 전 복원 | 아직 변경 통지를 구독하지 않음 | `dark`로 변경 |
| 구독 등록 | 이후 변경을 받을 준비를 함 | 이미 `dark` |
| 별도 갱신이 없음 | 이전 렌더에서 읽은 값이 남을 수 있음 | `dark` |

이 표는 변경을 놓치는 조건을 설명한 것입니다. 모든 컴포넌트 구성에서 같은 증상이 나온다는 뜻은 아닙니다. 다른 구독자의 업데이트나 추가 렌더가 있으면 결과가 달라질 수 있습니다.

특히 `useLayoutEffect` 안에서 React 업데이트가 발생하면 나머지 이펙트가 즉시 실행될 수도 있습니다. 이펙트 이름만 보고 전체 실행 순서를 단정하기보다, 실제 구성에서 읽기·쓰기·구독 순서를 확인해야 합니다. [React의 useLayoutEffect 설명](https://react.dev/reference/react/useLayoutEffect)

## 3. 구독을 바꿀 것인가, 초기값을 만드는 방식을 바꿀 것인가

처음 생각할 수 있는 해결책은 구독 방식을 바꾸는 것입니다.

Jotai 3.0.0에는 `useSyncExternalStore`를 사용하는 `useAtomValueRawSync`도 있습니다. 외부 스토어와 React의 읽기·구독을 연결하는 구현입니다. 다만 이 훅의 존재만으로 브라우저 저장소를 읽는 초기화와 SSR까지 자동으로 해결되지는 않습니다. [Jotai 3.0.0의 동기 구독 구현](https://github.com/pmndrs/jotai/blob/v3.0.0/src/react/useAtomValueRawSync.ts)

기존 읽기 API를 공용 훅으로 감싸는 방법도 생각할 수 있습니다. 여러 소비처를 한 번에 바꾸거나 구독 정책을 통일해야 한다면 유효한 선택입니다.

하지만 이번 예제에서는 먼저 초기화 구조를 바꿀 수 있는지 살펴보는 편이 낫다고 생각합니다. 화면에 필요한 값은 이미 브라우저에 있는데, 첫 렌더에는 다른 값을 읽고 나중에 이펙트로 복사하고 있습니다. 그러면 복원과 구독 사이의 순서가 정확히 맞아야 합니다.

질문을 바꿔볼 수 있습니다.

> 이미 존재하는 값을, 왜 마운트 이후에야 읽을 수 있게 만들었을까?

클라이언트에서만 렌더링한다면, 소비 컴포넌트가 마운트되기 전에 스토어에 초기값을 넣는 방법이 있습니다. Jotai를 계속 사용하면서 초기화 위치만 바꿀 수 있습니다.

서버 렌더링이 있다면 서버에서 구한 초기값을 클라이언트에 전달하는 방법도 고려해야 합니다. Jotai의 `useHydrateAtoms`는 이렇게 전달받은 값으로 atom을 초기화할 때 사용할 수 있습니다. 브라우저의 `localStorage`를 서버에서 읽게 해주는 기능은 아닙니다. [Jotai의 SSR 문서](https://jotai.org/docs/utilities/ssr)

즉, 이 문제를 “Jotai를 쓰면 안 된다”로 결론 내릴 이유는 없습니다. **초기값을 어디서 얻을 수 있는지, atom의 파생 구조가 필요한지, 서버가 어떤 화면을 만들지**에 따라 선택이 달라집니다.

## 4. 브라우저 저장소를 직접 읽는 별도의 예제

테마처럼 값이 작고 atom 간 파생 관계가 필요하지 않은 경우에는, 브라우저 저장소를 React에 연결하는 어댑터를 직접 만들 수도 있습니다.

다음 예제는 `localStorage`를 원천으로 두고 `useSyncExternalStore`로 읽습니다. 테마 값의 읽기·쓰기·변경 통지를 하나의 모듈에 모았습니다.

```tsx
import { useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'demo-theme';
const listeners = new Set<() => void>();

function getSnapshot(): Theme {
  if (typeof window === 'undefined') return 'light';

  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark'
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

function getServerSnapshot(): Theme {
  return 'light';
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  function onStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY && event.key !== null) return;

    try {
      if (event.storageArea === window.localStorage) listener();
    } catch {
      // 저장소에 접근할 수 없는 환경에서는 기본값을 사용합니다.
    }
  }

  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function setTheme(next: Theme): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    return false;
  }

  listeners.forEach((listener) => listener());
  return true;
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}
```

이 예제는 읽을 때 새 객체를 만들지 않고 `light` 또는 `dark`라는 문자열을 반환합니다. 값이 변하지 않으면 `getSnapshot`의 결과도 같습니다. 객체를 반환하는 설계라면, 변경이 없는 동안 같은 스냅샷을 반환하도록 캐시해야 합니다. [React의 외부 스토어 API](https://react.dev/reference/react/useSyncExternalStore)

같은 탭의 쓰기는 `setTheme`이 리스너에 알리고, 같은 출처의 다른 탭에서 발생한 변경은 `storage` 이벤트로 받습니다. 이 이벤트는 값을 변경한 창 자체에는 발생하지 않습니다. [MDN의 storage 이벤트 설명](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)

저장에 실패하면 `false`를 반환하므로 호출부에서 안내 메시지를 표시하는 등의 처리를 할 수 있습니다.

## 5. SSR에서 지킬 것은 첫 화면의 일치

서버는 브라우저의 `localStorage`를 읽을 수 없습니다. 예제에서는 서버에서 `light`를 반환하고, 클라이언트의 하이드레이션에서도 같은 값을 사용합니다. 이후 브라우저에 저장된 값이 `dark`라면 화면이 갱신됩니다.

`getServerSnapshot`은 서버 렌더링과 하이드레이션에서 사용되므로 양쪽에서 같은 초기값을 반환해야 합니다. [React의 SSR 설명](https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering)

이 방식은 초기 화면의 불일치를 피하지만, 저장된 테마가 반영되면서 색상이 바뀌는 현상까지 없애지는 않습니다. 처음부터 선택한 테마를 보여주고 싶다면 화면을 그리기 전에 적용하는 처리나 서버에서도 읽을 수 있는 저장 방식 등을 따로 검토해야 합니다.

SSR에 대응하는 것과 테마의 깜빡임을 없애는 것은 각각 확인해야 할 문제입니다.

## 6. 읽기를 정리하면 쓰기 쪽의 책임도 달라집니다

이 예제는 `localStorage`를 직접 읽지만, 저장소의 모든 변경에 자동으로 이벤트를 붙이지는 않습니다. 같은 탭의 다른 코드가 직접 `setItem`을 호출하면 자체 리스너에 통지가 가지 않습니다.

쓰기를 `setTheme`으로 모으는 이유는 이 경로를 맞추기 위해서입니다. 상태를 외부 스토어로 다룬다면 읽기뿐 아니라 변경을 어떻게 알릴지까지 설계해야 합니다.

값을 한 번만 읽어 캐시하는 설계라면 업데이트·삭제 시 캐시를 갱신하는 경로도 필요합니다. 클라이언트 페이지 이동에서는 모듈 상태가 유지될 수 있으므로, 페이지가 바뀌면 자동으로 초기화된다고 가정할 수는 없습니다.

## 7. 확인할 때는 값뿐 아니라 순서와 환경도 봅니다

이런 변경을 검증할 때는 setter 호출 후의 값뿐 아니라 초기화와 구독의 경계를 확인하고 싶습니다.

- 초기값을 읽은 후 구독 전에 값이 바뀌어도 화면이 따라오는가.
- 저장된 설정이 없어도 기본값을 표시하는가.
- 같은 탭과 다른 탭의 변경을 각각 받는가.
- 저장소 접근이 실패했을 때 처리할 수 있는가.
- 서버 HTML과 하이드레이션 시점의 표시가 일치하는가.
- 재마운트와 클라이언트 페이지 이동에서도 이전 값이 남지 않는가.

특히 첫 번째 항목은 저장소의 최종값만 확인해서는 놓치기 쉽습니다. 저장소가 올바른 값이어도 화면이 이전 값을 표시할 수 있으므로, 렌더된 결과를 함께 확인해야 합니다.

## 돌아보며

Jotai의 두 버전을 비교한 출발점은 구독 뒤의 `rerender()` 한 줄이었습니다. 그 차이를 따라가며 더 신경 쓰게 된 것은 초기값을 나중에 복사하는 구조였습니다.

API 사용법이 바뀌지 않아도 내부 구현이 보완하던 타이밍에 기대고 있었다면 업그레이드 후 차이가 드러날 수 있습니다. 그때는 값을 어디서 얻는지, 처음 언제 읽는지, 변경을 어떤 경로로 알리는지 나눠보는 것이 도움이 됩니다.

Jotai를 유지하면서 초기화를 정리하는 방법도 있고, 외부 스토어에 연결하는 방법도 있습니다. 어느 쪽을 선택하든 “나중에 동기화하면 맞겠지”에서 멈추지 않고, 첫 화면이 어떤 값을 읽는지까지 설명할 수 있는 설계를 하고 싶어졌습니다.
