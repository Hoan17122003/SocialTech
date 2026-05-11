"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/common/utils/format-date";
import { ApiError } from "@/common/types/api";
import { usersApi } from "@/features/users/users-api";
import type { UserProfile } from "@/features/users/contracts";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input, Textarea } from "@/shared/ui/field";
import { FormMessage } from "@/shared/ui/form-message";
import { SectionShell } from "@/shared/ui/section-shell";

export function ProfilePanel({ userId }: { userId: number }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<File | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await usersApi.getProfile(userId);

        if (!isMounted || !response.data) {
          return;
        }

        setProfile(response.data);
        setDisplayName(response.data.displayName);
        setBio(response.data.bio);
      } catch (cause) {
        if (isMounted) {
          setError(
            cause instanceof ApiError ? cause.message : "Khong the tai profile.",
          );
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      await usersApi.updateProfile({
        displayName,
        bio,
        profileImageUrl: avatar,
      });
      setStatus("Da gui cap nhat profile len backend.");
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Khong the cap nhat profile.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error && !profile) {
    return <EmptyState title="Khong tai duoc profile" description={error} />;
  }

  if (!profile) {
    return (
      <EmptyState
        title="Dang tai profile"
        description="Component nay dang map toi `POST /api/User/profile/{id}` va doi du lieu that."
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <SectionShell
        eyebrow="User Profile"
        title={profile.displayName}
        description={profile.bio || "Nguoi dung chua cap nhat bio."}
      >
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Followers" value={profile.followersCount} />
            <StatCard label="Following" value={profile.followingsCount} />
            <StatCard label="Editing" value={profile.isPermissionEdit ? "Yes" : "No"} />
          </div>
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Bai viet gan day
            </h3>
            <div className="mt-4 grid gap-3">
              {profile.recentPosts.length ? (
                profile.recentPosts.map((post) => (
                  <div
                    key={post.postId}
                    className="rounded-2xl border border-[var(--line)] bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-semibold">{post.title}</h4>
                      <span className="text-xs text-[var(--muted)]">
                        {formatDateTime(post.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {post.body}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">Chua co bai viet nao.</p>
              )}
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Profile Update"
        title="Cap nhat thong tin ca nhan"
        description="Mau form `multipart/form-data` cho `POST /api/User/profile/update`."
      >
        <form className="grid gap-4" onSubmit={handleUpdate}>
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Display name"
          />
          <Textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Bio"
          />
          <Input
            type="file"
            accept="image/*"
            onChange={(event) => setAvatar(event.target.files?.[0])}
          />
          {error ? <FormMessage type="error" message={error} /> : null}
          {status ? <FormMessage type="success" message={status} /> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Dang cap nhat..." : "Luu thay doi"}
            </Button>
          </div>
        </form>
      </SectionShell>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}
