import { Toaster as Sonner, type ToasterProps as SonnerProps } from "sonner";
import { useTheme } from "../../hooks/use-theme.tsx";

export type ToasterProps = SonnerProps;

/** Toast region (sonner). Announced politely; never steals focus. At most 3 visible. */
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-right"
      visibleToasts={3}
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-md !border !border-border !bg-surface-raised !text-text !shadow-md !font-sans",
          description: "!text-text-muted",
        },
      }}
      {...props}
    />
  );
}
