export function PageIntro({
  title,
  mutedTitle,
  description,
}: {
  title: string;
  mutedTitle?: string;
  description: string;
}) {
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-[-.035em] text-white sm:text-3xl lg:text-4xl">
        {title}
        {mutedTitle && (
          <>
            <br />
            <span className="text-slate-500">{mutedTitle}</span>
          </>
        )}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
        {description}
      </p>
    </section>
  );
}
