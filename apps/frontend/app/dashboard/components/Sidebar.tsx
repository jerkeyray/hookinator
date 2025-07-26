import { GitBranch, Home, Settings } from "lucide-react";
import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="hidden md:block w-64 lg:w-72 xl:w-80 flex-shrink-0 border-r border-gray-800 bg-black">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-16 items-center border-b border-gray-800 px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <GitBranch className="h-6 w-6" />
            <span className="truncate">Hookinator</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg bg-gray-900 px-3 py-2 text-white transition-all hover:text-white"
            >
              <Home className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Dashboard</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white"
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Settings</span>
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
