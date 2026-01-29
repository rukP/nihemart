import { Loader } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// Google SVG Icon Component
const GoogleIcon = () => (
   <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
   >
      <path
         fill="#4285F4"
         d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
         fill="#34A853"
         d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
         fill="#FBBC05"
         d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
         fill="#EA4335"
         d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
   </svg>
);

// Updated Google Sign-in Button Component
interface GoogleSignInButtonProps {
   onClick: () => void;
   loading?: boolean;
   text?: string;
   variant?: "signin" | "signup";
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
   onClick,
   loading = false,
   text,
   variant = "signin",
}) => {
   const { t } = useLanguage();

   const buttonText =
      text ||
      (variant === "signin"
         ? t("auth.google.signin")
         : t("auth.google.signup"));

   return (
      <button
         type="button"
         onClick={onClick}
         disabled={loading}
         className="
        w-full h-12 px-4 py-2
        flex items-center justify-center gap-3
        bg-white border border-gray-300 rounded-lg
        hover:bg-gray-50 hover:border-gray-400 hover:shadow-md
        active:bg-gray-100 active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 disabled:hover:shadow-none
        transition-all duration-200 ease-in-out
        text-gray-700 font-medium text-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        group
      "
         aria-label={buttonText}
      >
         {loading ? (
            <Loader className="w-5 h-5 animate-spin text-gray-500" />
         ) : (
            <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
               <GoogleIcon />
            </div>
         )}
         <span className="flex-1 text-center font-roboto">
            {loading ? t("common.loading") : buttonText}
         </span>
         {/* Invisible element to center the text properly */}
         <div className="w-5 h-5 flex-shrink-0 opacity-0">
            <GoogleIcon />
         </div>
      </button>
   );
};

// Alternative version with more styling options
const GoogleSignInButtonAdvanced: React.FC<
   GoogleSignInButtonProps & {
      size?: "sm" | "md" | "lg";
      fullWidth?: boolean;
   }
> = ({
   onClick,
   loading = false,
   text,
   variant = "signin",
   size = "md",
   fullWidth = true,
}) => {
   const { t } = useLanguage();

   const buttonText =
      text ||
      (variant === "signin"
         ? t("auth.google.signin")
         : t("auth.google.signup"));

   const sizeClasses = {
      sm: "h-10 px-3 text-sm gap-2",
      md: "h-12 px-4 text-sm gap-3",
      lg: "h-14 px-6 text-base gap-4",
   };

   return (
      <button
         type="button"
         onClick={onClick}
         disabled={loading}
         className={`
        ${fullWidth ? "w-full" : "inline-flex"} ${sizeClasses[size]}
        flex items-center justify-center
        bg-white border border-gray-300 rounded-xl
        hover:bg-gray-50 hover:border-gray-400 hover:shadow-lg
        active:bg-gray-100 active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 disabled:hover:shadow-none
        transition-all duration-200 ease-in-out
        text-gray-700 font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        group relative overflow-hidden
        before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
        before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700
      `}
         aria-label={buttonText}
      >
         {loading ? (
            <Loader className="w-5 h-5 animate-spin text-gray-500" />
         ) : (
            <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
               <GoogleIcon />
            </div>
         )}
         <span className="flex-1 text-center font-medium tracking-wide">
            {loading ? t("common.loading") : buttonText}
         </span>
         {/* Invisible spacer for perfect centering */}
         <div className="w-5 h-5 flex-shrink-0 opacity-0">
            <GoogleIcon />
         </div>
      </button>
   );
};

export { GoogleSignInButton, GoogleSignInButtonAdvanced };
