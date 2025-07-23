import {
  ArrowRight,
  Code,
  Terminal,
  CheckCircle,
  GitBranch,
} from "lucide-react";
import { Button } from "../components/ui/button"; // Assuming button is in components/ui
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../components/ui/card"; // Assuming card is in components/ui
import React from "react";

// --- Main Landing Page Component ---
export default function HookinatorLandingPage() {
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* --- Header --- */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-gray-800 sticky top-0 bg-black/80 backdrop-blur-sm z-50">
        <a className="flex items-center justify-center gap-2" href="#">
          <GitBranch className="h-6 w-6" />
          <span className="font-bold text-xl">Hookinator</span>
        </a>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button
            variant="default"
            className="bg-white text-black hover:bg-gray-200 font-bold sm:font-extrabold"
          >
            Sign In
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </nav>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col items-center justify-center">
        {/* --- Hero Section --- */}
        <section className="w-full py-24 md:py-32 lg:py-40 flex flex-col items-center text-center">
          <div className="container flex flex-col items-center px-4 md:px-6">
            <div className="max-w-3xl mx-auto space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-gray-50 to-gray-400">
                The Ultimate Webhook Toolkit for Developers
              </h1>
              <p className="text-lg text-gray-400 md:text-xl">
                Capture, inspect, and debug webhooks in real-time. Get a unique
                URL and start receiving requests in seconds. No setup, no
                hassle.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-black font-bold text-lg px-8 py-4 rounded-lg shadow-md hover:scale-105 hover:bg-gray-200 transition-transform duration-150"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* --- Demo/Visual Section --- */}
        <section className="w-full pb-24 md:pb-32 lg:pb-40 flex flex-col items-center">
          <div className="container px-4 md:px-6">
            <Card className="max-w-4xl mx-auto bg-gray-900/50 border-gray-800 shadow-2xl shadow-gray-500/5">
              <CardHeader className="flex flex-row items-center gap-2 border-b border-gray-800 p-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <p className="text-sm font-mono text-gray-400">
                  POST /inspect/a1b2-c3d4-e5f6
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <pre className="text-sm overflow-x-auto">
                  <code className="text-gray-300">
                    {`{
  "id": "evt_1P9XYZABCDEFGHIJKL",
  "object": "event",
  "api_version": "2024-06-20",
  "data": {
    "object": {
      "id": "cus_ABCDEFGHIJKLMN",
      "object": "customer",
      "email": "jenny.rosen@example.com",
      "name": "Jenny Rosen"
    }
  },
  "livemode": false,
  "type": "customer.created"
}`}
                  </code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* --- Features Section --- */}
        <section className="w-full py-24 md:py-32 bg-gray-900/50 border-y border-gray-800 flex flex-col items-center">
          <div className="container flex flex-col items-center px-4 md:px-6">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center text-center gap-2">
                <Terminal className="h-10 w-10 mb-2" />
                <h3 className="text-xl font-bold">Instant URL</h3>
                <p className="text-gray-400">
                  Generate a unique endpoint instantly. No sign-up required to
                  start inspecting your webhook payloads.
                </p>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <Code className="h-10 w-10 mb-2" />
                <h3 className="text-xl font-bold">Real-time Inspection</h3>
                <p className="text-gray-400">
                  View headers, payloads, and query parameters in a clean,
                  readable format as soon as they arrive.
                </p>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <CheckCircle className="h-10 w-10 mb-2" />
                <h3 className="text-xl font-bold">Reliable & Secure</h3>
                <p className="text-gray-400">
                  Built for developers. Securely forward requests to your local
                  machine without exposing your network.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- Final CTA --- */}
        <section className="w-full py-24 md:py-32 flex flex-col items-center">
          <div className="container flex flex-col items-center text-center px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Stop guessing. Start inspecting.
            </h2>
            <p className="max-w-xl mx-auto mt-4 text-gray-400">
              Get the clarity you need to build and debug your webhook
              integrations faster than ever before.
            </p>
            <div className="mt-6">
              <Button
                size="lg"
                className="bg-white text-black font-bold text-lg px-8 py-4 rounded-lg shadow-md hover:scale-105 hover:bg-gray-200 transition-transform duration-150"
              >
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* --- Footer --- */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Hookinator. All Rights Reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <a
            className="text-xs hover:underline underline-offset-4 text-gray-400"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="text-xs hover:underline underline-offset-4 text-gray-400"
            href="#"
          >
            Privacy
          </a>
        </nav>
      </footer>
    </div>
  );
}
