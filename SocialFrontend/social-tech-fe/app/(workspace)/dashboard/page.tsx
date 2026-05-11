import Link from "next/link";
import { APP_ROUTES } from "@/common/constants/app-routes";
import { SectionShell } from "@/shared/ui/section-shell";

const modules = [
  {
    title: "Authentication",
    description:
      "Login, logout, refresh access token va luu session client theo contract backend.",
  },
  {
    title: "User Profile",
    description:
      "Lay profile, cap nhat display name, bio, avatar va xem danh sach follower.",
  },
  {
    title: "Article",
    description:
      "Tao bai viet multipart, xem chi tiet bai viet, lam san cho update/delete sau nay.",
  },
];

export default function DashboardPage() {
  return (
    <div className="grid gap-8">
      <SectionShell
        eyebrow="Workspace"
        title="Frontend base da san sang de team tiep tuc xay feature"
        description="Trang nay gom cac luong nghiep vu mau, giup backend va frontend co mot hop dong ro rang khi phat trien song song."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.title}
              className="rounded-[2rem] border border-[var(--line)] bg-white/85 p-5 shadow-[var(--shadow)]"
            >
              <h3 className="text-lg font-semibold">{module.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                {module.description}
              </p>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Quick Start"
        title="Luot dieu huong chinh"
        description="Cac route nay la noi team co the gap API that, bo sung state management va tiep tuc mo rong business UI."
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href={APP_ROUTES.register}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
          >
            Dang ky
          </Link>
          <Link
            href={APP_ROUTES.createArticle}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
          >
            Tao bai viet
          </Link>
          <Link
            href="/profile/1"
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
          >
            Profile mau
          </Link>
          <Link
            href="/articles/1"
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
          >
            Chi tiet bai viet mau
          </Link>
        </div>
      </SectionShell>
    </div>
  );
}
