
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X } from "lucide-react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4 ${
        isScrolled ? "bg-background/80 backdrop-blur-lg shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-semibold text-xl">ZKP Auth</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-foreground/80 hover:text-foreground transition-colors">
            Home
          </Link>
          <Link to="#features" className="text-foreground/80 hover:text-foreground transition-colors">
            Features
          </Link>
          <Link to="#how-it-works" className="text-foreground/80 hover:text-foreground transition-colors">
            How It Works
          </Link>
          <Link to="/dashboard" className="text-foreground/80 hover:text-foreground transition-colors">
            Dashboard
          </Link>
        </nav>
        
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" className="rounded-full">
            Documentation
          </Button>
          <Button variant="default" className="rounded-full">
            Get Started
          </Button>
        </div>
        
        <button 
          className="md:hidden text-foreground/80 hover:text-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-lg border-b animate-fade-in">
          <div className="container mx-auto py-4 px-4 flex flex-col gap-4">
            <Link to="/" className="py-2 text-foreground/80 hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="#features" className="py-2 text-foreground/80 hover:text-foreground transition-colors">
              Features
            </Link>
            <Link to="#how-it-works" className="py-2 text-foreground/80 hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link to="/dashboard" className="py-2 text-foreground/80 hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <div className="flex flex-col gap-2 pt-2 border-t">
              <Button variant="ghost" className="justify-start">
                Documentation
              </Button>
              <Button variant="default">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
