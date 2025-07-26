import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { signOut } from "next-auth/react";

export default function DashboardHeader({ userImage }: { userImage: string }) {
  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b border-gray-800 bg-black px-4 lg:px-6">
      <div className="w-full flex-1">
        {/* Mobile Nav would go here if needed */}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Image
              src={userImage}
              width={36}
              height={36}
              alt="User Avatar"
              className="rounded-full"
            />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-black border-gray-800 text-white"
        >
          <DropdownMenuItem className="cursor-pointer hover:!bg-gray-800">
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer hover:!bg-gray-800">
            Support
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              handleSignOut();
            }}
            className="cursor-pointer hover:!bg-gray-800"
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
