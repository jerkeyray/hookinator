import { GitBranch, Home, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { signOut } from "next-auth/react";

export default function Sidebar({
  userImage,
  userName,
}: {
  userImage: string;
  userName: string;
}) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <div className="hidden md:block w-40 lg:w-48 xl:w-56 flex-shrink-0 border-r border-gray-800 bg-black h-full">
      <div className="flex h-full max-h-screen flex-col">
        {/* Header */}
        <div className="flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <GitBranch className="h-5 w-5 text-black" />
            </div>
            <span className="truncate text-lg font-bold text-white">
              Hookinator
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-6">
          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                pathname === "/dashboard"
                  ? "bg-gray-900 text-white"
                  : "text-gray-400 hover:bg-gray-900 hover:text-white"
              }`}
            >
              <Home className="h-5 w-5 flex-shrink-0" />
              <span className="truncate font-medium">Dashboard</span>
            </Link>
            <Link
              href="/settings"
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                pathname === "/settings"
                  ? "bg-gray-900 text-white"
                  : "text-gray-400 hover:bg-gray-900 hover:text-white"
              }`}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              <span className="truncate font-medium">Settings</span>
            </Link>
          </nav>
        </div>

        {/* User Profile Section - Fixed at bottom */}
        <div className="p-4 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 p-3 rounded-lg hover:bg-gray-900 transition-colors"
              >
                <Image
                  src={userImage}
                  width={32}
                  height={32}
                  alt="User Avatar"
                  className="rounded-full"
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">
                    {userName}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 bg-black border-gray-800 text-white"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleSignOut();
                }}
                className="cursor-pointer hover:!bg-gray-800 gap-2 text-red-400 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
