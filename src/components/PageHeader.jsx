// Shared page header used at the top of every tool page.
// Renders an icon badge, title, and description with responsive sizing.

export default function PageHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center gap-2.5 sm:gap-3 mb-1.5 sm:mb-2">
        <span className="bg-accentBg border border-accentBorder rounded-[10px] p-1.5 sm:p-2 text-accent shrink-0">
          <Icon size={18} className="sm:size-5" />
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold text-textHeader m-0">{title}</h1>
      </div>
      <p className="text-text text-xs sm:text-sm m-0">
        {description}
      </p>
    </div>
  )
}
