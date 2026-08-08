type Props = { categories: string[]; activeTab: string; searchQuery: string; onTabChange: (tab: string) => void; onSearchChange: (query: string) => void };

export function NewsFilters({ categories, activeTab, searchQuery, onTabChange, onSearchChange }: Props) {
    return <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-wrap gap-2.5">{categories.map((tab) => <button key={tab} type="button" onClick={() => onTabChange(tab)} className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${activeTab === tab ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]' : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--bg-hover)]'}`}>{tab === 'All' ? 'Tất cả' : tab}</button>)}</div>
        <input type="text" placeholder="Tìm bài viết..." value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] py-2.5 px-4 text-xs text-[var(--foreground)] shadow-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] md:w-80" />
    </div>;
}
