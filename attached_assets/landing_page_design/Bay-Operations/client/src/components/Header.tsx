import { useState } from "react";
import { Link } from "wouter";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/ContactDialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-[#0d1b2a]/95 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/images/bayops-logo.png" 
            alt="BayOPS - Enterprise Shop Management Software" 
            className="h-12 w-auto"
            data-testid="img-logo"
          />
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/login" className="text-slate-300 hover:text-white font-medium transition-colors" data-testid="link-signin">
            Sign In
          </Link>
          <Button 
            size="lg" 
            className="bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 transition-all" 
            data-testid="button-get-started"
            onClick={() => window.location.href = '/api/checkout'}
          >
            Get Started
          </Button>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-mobile-menu">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-[#0d1b2a] border-white/10">
              <div className="flex flex-col gap-6 mt-10">
                <Link href="/login" className="text-lg font-medium text-white" onClick={() => setIsOpen(false)}>
                  Sign In
                </Link>
                <Button 
                  size="lg" 
                  className="w-full bg-sky-500 hover:bg-sky-400"
                  onClick={() => window.location.href = '/api/checkout'}
                >
                  Get Started
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
