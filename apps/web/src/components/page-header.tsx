import { useEffect, type ReactNode } from "react";

export const PAGE_TITLE_ID = "page-title";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

/** The page's single H1. Sets the document title ("Page – contact-fuse"). */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} – contact-fuse`;
  }, [title]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1
          id={PAGE_TITLE_ID}
          tabIndex={-1}
          className="text-2xl font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {title}
        </h1>
        {description ? <p className="max-w-prose text-sm text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
