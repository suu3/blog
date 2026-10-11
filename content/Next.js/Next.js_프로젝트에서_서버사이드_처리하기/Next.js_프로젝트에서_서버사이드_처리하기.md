---
title: Next.js 프로젝트에서 서버사이드 처리하기 (리디렉션, 데이터 프리페칭)
date: "2024-01-28"
description: "Next.js Pages Router에서 인증 리디렉션과 TanStack Query 데이터 프리페칭을 서버사이드에서 처리하는 방법을 정리했습니다."
tag: ["ssr", "next.js"]
category: "Next.js"
---

React.js에서 Next.js로 프로젝트를 옮길 때는, 클라이언트에서 처리하던 것들을 서버사이드로 옮겨볼 수 있습니다. 저는 그중에서도 페이지 접근 조건에 따른 리디렉션과 데이터 프리페칭에 관심이 있었습니다.

이 글에서는 두 기능을 `getServerSideProps`로 처리하는 방법과 구성할 때 주의할 점을 정리했습니다. **Pages Router와 TanStack Query v4 기준**이며, 아래 코드는 설명을 위해 새로 작성한 일반 예제입니다. `example.com`의 API 주소와 데이터 형태는 예시이므로 사용하는 API에 맞게 바꿔주시면 됩니다.

## 1. Router Guard 처리하기

특정 사용자만 접근할 수 있는 페이지를 만들 때, 접근 조건을 확인하고 다른 페이지로 보내는 처리를 저는 Guard라고 부릅니다. Vue의 Navigation Guards를 생각하면 이해하기 편합니다.

처리 위치로는 다음 방법들을 생각할 수 있습니다.

1. 클라이언트에서 처리하기
2. middleware에서 처리하기
3. `getInitialProps` 또는 `getServerSideProps`에서 처리하기

클라이언트에서 처리하면 페이지를 보여준 뒤 접근 조건을 확인하게 될 수 있습니다. 로그인 화면으로 이동하기 전에 원래 페이지가 잠깐 보이거나, 이동이 늦게 느껴지는 문제가 생길 수 있습니다.

middleware는 여러 페이지에 공통으로 적용할 조건을 처리할 때 편합니다. 다만 페이지별로 다른 데이터가 필요하거나 접근 조건과 데이터 페칭을 같이 처리하고 싶다면, 페이지의 `getServerSideProps`에서 구성하는 방법도 있습니다.

`getInitialProps`는 초기 요청과 클라이언트 라우팅에서 실행되는 위치가 달라질 수 있지만, `getServerSideProps`는 서버에서 실행됩니다. 페이지마다 인증 조건을 확인하고 그다음 데이터를 가져오는 예제에서는 `getServerSideProps`를 사용하겠습니다. [Next.js 공식 문서](https://nextjs.org/docs/pages/api-reference/functions/get-server-side-props)

### getServerSideProps에 인증 처리를 조합하기

페이지마다 인증 코드를 복사하는 대신, 인증을 담당하는 래퍼를 만들고 페이지별 데이터 처리를 콜백으로 전달할 수 있습니다. 이 구성은 [getServerSideProps를 인증용 HOC로 사용하는 논의](https://github.com/vercel/next.js/discussions/10925)를 참고했습니다.

예를 들어 로그인한 사용자만 접근하는 페이지라면 다음처럼 작성할 수 있습니다.

```ts
// lib/with-login.ts
import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next';

export type Viewer = { id: string; name: string };

type PageLoader<Props> = (
  context: GetServerSidePropsContext,
  viewer: Viewer,
) => Promise<GetServerSidePropsResult<Props>>;

export function withLogin<Props extends Record<string, unknown>>(
  loadPage: PageLoader<Props>,
): GetServerSideProps<Props> {
  return async (context) => {
    const token = context.req.cookies.access_token;
    const loginRedirect = {
      redirect: { destination: '/login', permanent: false },
    } as const;

    if (!token) return loginRedirect;

    const response = await fetch('https://example.com/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401 || response.status === 403) {
      return loginRedirect;
    }
    if (!response.ok) throw new Error('사용자 정보를 가져오지 못했습니다.');

    const viewer: Viewer = await response.json();
    return loadPage(context, viewer);
  };
}
```

쿠키가 있는지만 확인하면 만료되거나 잘못된 토큰도 통과할 수 있으므로, 예제에서는 API를 통해 유효한 사용자 정보를 확인하도록 했습니다. API가 일시적으로 실패한 경우까지 로그아웃으로 처리하지 않도록 인증 실패와 그 외 오류도 나눴습니다.

페이지에서는 인증 로직을 다시 작성하지 않고, 필요한 props를 만드는 부분만 전달합니다.

```tsx
// pages/home.tsx
import { withLogin } from '../lib/with-login';

type HomeProps = { greeting: string };

export const getServerSideProps = withLogin<HomeProps>(async (_, viewer) => {
  return { props: { greeting: `${viewer.name}님, 안녕하세요!` } };
});

export default function Home({ greeting }: HomeProps) {
  return <h1>{greeting}</h1>;
}
```

이렇게 하면 인증 처리는 공통으로 관리하면서도 페이지 자신의 데이터 처리 로직을 유지할 수 있습니다. 지역화처럼 다른 공통 처리가 필요할 때도 같은 원리로 조합할 수 있습니다. 다만 앞 단계에서 `redirect`나 `notFound`를 반환했다면 다음 단계는 실행하지 않아야 합니다.

## 2. (React-query) ServerSide Prefetching

다음은 첫 화면에서 필요한 데이터를 서버에서 미리 가져오는 방법입니다. 클라이언트가 페이지를 받은 뒤 API를 요청하는 대신, 서버에서 데이터를 가져와 페이지에 함께 전달하면 처음부터 데이터가 있는 화면을 보여줄 수 있습니다.

TanStack Query에서는 서버에서 `prefetchQuery`를 실행하고, 캐시를 `dehydrate`한 뒤 클라이언트에서 `Hydrate`로 복원합니다. [TanStack Query v4 SSR 문서](https://tanstack.com/query/v4/docs/framework/react/guides/ssr)

### 서버 사이드에서 쿠키 처리하기

브라우저에서는 쿠키를 읽거나 같은 출처의 요청에 쿠키를 함께 보내는 방식으로 인증을 처리할 수 있습니다. 반면 서버에서 외부 API를 호출할 때는 브라우저의 쿠키가 자동으로 전달되지 않습니다. `getServerSideProps`의 `context.req.cookies`에서 필요한 값을 읽고, API가 요구하는 인증 헤더를 넣어줘야 합니다.

이때 서버 요청마다 인증 정보를 따로 전달하는 것이 중요합니다. 현재 요청의 `context`나 토큰을 모듈 전역 변수에 넣으면, 여러 사용자 요청이 동시에 들어왔을 때 다른 요청의 값으로 덮어써질 수 있습니다.

서버와 클라이언트에서 데이터 페칭 함수를 재사용하고 싶다면, 요청별로 페칭 함수를 만드는 방식으로 구성할 수 있습니다. Axios를 사용한다면 같은 원리로 요청마다 `axios.create`로 인스턴스를 만들고 인증 헤더를 설정할 수 있습니다. [Axios의 서버사이드 interceptor 관련 논의](https://github.com/axios/axios/issues/4976)도 함께 참고했습니다.

```ts
// lib/article-query.ts
export type Article = { id: string; title: string };

export const articleKey = (viewerId: string) => ['articles', viewerId] as const;

export function createArticleFetcher(token?: string) {
  return async (): Promise<Article[]> => {
    const url = token ? 'https://example.com/api/articles' : '/api/articles';
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'same-origin',
    });

    if (!response.ok) throw new Error('글 목록을 가져오지 못했습니다.');
    return response.json();
  };
}
```

서버에서는 토큰을 전달해 외부 API를 호출하고, 브라우저에서는 같은 출처의 `/api/articles`를 호출하는 예제입니다. 이 경로는 별도로 구현한 API Route가 있다고 가정하며, 해당 API에서도 쿠키를 검증하고 같은 형태의 데이터를 반환해야 합니다.

### getServerSideProps에서 미리 가져오기

앞에서 만든 인증 래퍼를 사용해 사용자 정보를 확인한 뒤, 사용자별 글 목록을 프리페칭합니다.

```ts
// pages/articles.tsx의 서버사이드 처리
import { dehydrate, QueryClient } from '@tanstack/react-query';
import type { DehydratedState } from '@tanstack/react-query';
import { withLogin } from '../lib/with-login';
import { articleKey, createArticleFetcher } from '../lib/article-query';

type ArticlesProps = { viewerId: string; dehydratedState: DehydratedState };

export const getServerSideProps = withLogin<ArticlesProps>(
  async (context, viewer) => {
    const queryClient = new QueryClient();
    const fetchArticles = createArticleFetcher(context.req.cookies.access_token);

    await queryClient.prefetchQuery({
      queryKey: articleKey(viewer.id),
      queryFn: fetchArticles,
      staleTime: 60_000,
    });

    return {
      props: {
        viewerId: viewer.id,
        dehydratedState: dehydrate(queryClient),
      },
    };
  },
);
```

**서버의 `QueryClient`는 요청마다 새로 생성합니다.** 여러 사용자가 같은 캐시를 공유하지 않도록 하기 위해서입니다. 토큰은 API 호출에만 사용하고, 페이지의 props나 QueryKey에 넣지 않습니다. `dehydrate`로 전달하는 데이터는 브라우저에서도 볼 수 있으므로, API 응답에도 공개하면 안 되는 필드는 포함하지 않아야 합니다.

### 클라이언트에서 캐시 복원하기

`_app.tsx`에서는 브라우저에서 사용할 `QueryClient`를 유지하고, 서버에서 내려준 상태를 `Hydrate`에 전달합니다.

```tsx
// pages/_app.tsx
import { useState } from 'react';
import type { AppProps } from 'next/app';
import { Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={pageProps.dehydratedState}>
        <Component {...pageProps} />
      </Hydrate>
    </QueryClientProvider>
  );
}
```

페이지의 클라이언트 컴포넌트에서는 서버에서 사용한 것과 **같은 QueryKey**로 데이터를 조회합니다. 아래 컴포넌트는 앞의 `pages/articles.tsx`에 이어서 작성하는 부분입니다.

```tsx
import { useQuery } from '@tanstack/react-query';

export default function Articles({ viewerId }: ArticlesProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: articleKey(viewerId),
    queryFn: createArticleFetcher(),
  });

  if (isLoading) return <p>불러오는 중입니다.</p>;
  if (isError) return <p>글 목록을 가져오지 못했습니다.</p>;
  return <ul>{data?.map((article) => <li key={article.id}>{article.title}</li>)}</ul>;
}
```

서버와 클라이언트의 QueryKey가 다르면 미리 가져온 캐시를 찾지 못하고 다시 요청하게 됩니다. 특히 서버에서 쿠키 기반 값을 사용하고 클라이언트의 첫 렌더링에서는 그 값이 없는 식으로 구성하면, 같은 데이터인데도 서로 다른 쿼리로 취급될 수 있습니다. 예제에서는 양쪽 모두 props로 전달한 사용자 ID를 기준으로 키를 만들었습니다.

캐시를 찾지 못하는 것과 hydration 불일치는 같은 의미는 아닙니다. 다만 서버와 클라이언트가 첫 렌더링에서 서로 다른 화면을 만들면 hydration 경고까지 이어질 수 있으므로, 쿼리 키와 첫 렌더링에 필요한 값들을 함께 확인하는 것이 좋습니다.

`staleTime`도 지정해뒀습니다. 프리페칭한 데이터가 브라우저에서 곧바로 오래된 데이터로 판단되어 다시 요청되는 것을 줄이려는 목적이며, 데이터가 얼마나 자주 바뀌는지에 맞춰 조정하면 됩니다.

### largePageData

SSR을 적용하면 데이터를 더 빨리 보여줄 수 있지만, 너무 많은 데이터를 페이지에 함께 실어 보내면 HTML과 페이지 데이터 크기가 커집니다. Next.js는 페이지 데이터가 기본 기준인 128kB를 넘을 때 경고합니다. [Large Page Data 문서](https://nextjs.org/docs/messages/large-page-data)

```js
// next.config.js
module.exports = {
  experimental: { largePageDataBytes: 256 * 1024 },
};
```

이 설정은 경고 기준을 높이는 것이므로 데이터 크기를 줄여주는 해결책은 아닙니다. 저는 특별한 이유가 없으면 기본 기준을 지키는 편이 좋다고 생각합니다. 첫 화면에 필요한 쿼리만 프리페칭하고, 사용하지 않는 응답 필드를 제외하거나 페이지네이션을 적용할 수 있는지 먼저 확인하는 것이 좋습니다.

## Reference

- [Next.js getServerSideProps 문서](https://nextjs.org/docs/pages/api-reference/functions/get-server-side-props)
- [인증용 getServerSideProps 래퍼 관련 논의](https://github.com/vercel/next.js/discussions/10925)
- [TanStack Query v4 SSR 문서](https://tanstack.com/query/v4/docs/framework/react/guides/ssr)
- [Axios 서버사이드 interceptor 관련 이슈](https://github.com/axios/axios/issues/4976)
- [Next.js Large Page Data 문서](https://nextjs.org/docs/messages/large-page-data)
- [Creating Protected Routes / Route Guards in Next.js](https://www.youtube.com/watch?v=yQ93MyKyCmo)
