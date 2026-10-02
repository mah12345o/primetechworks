export const useRouter = () => ({
  push: () => {},
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
  replace: () => {},
});

export const usePathname = () => "/";
export const useSearchParams = () => new URLSearchParams();
