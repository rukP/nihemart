import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { optimizeImageUrl } from "@/lib/utils";

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  user: {
    imageUrl?: string;
    fullName?: string | null;
    subTitle: string;
  } | null;
}

export function UserAvatarProfile({
  className,
  showInfo = false,
  user,
}: UserAvatarProfileProps) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className={className}>
        <AvatarImage
          src={optimizeImageUrl(user?.imageUrl || null, {
            width: 128,
            quality: 75,
          })}
          alt={user?.fullName || ""}
        />
        <AvatarFallback className="rounded-lg">
          {user?.fullName?.slice(0, 2)?.toUpperCase() || "CN"}
        </AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="font-medium text-text-primary whitespace-nowrap">
            {user?.fullName || ""}
          </span>
          <span className="truncate text-sm text-text-secondary">
            {user?.subTitle || ""}
          </span>
        </div>
      )}
    </div>
  );
}
