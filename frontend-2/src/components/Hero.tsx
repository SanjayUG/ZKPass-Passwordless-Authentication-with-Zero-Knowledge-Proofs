
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LockKeyhole, Shield, RefreshCw, KeyRound, Fingerprint } from "lucide-react";

export function Hero() {
  return (
    <section className="hero-container py-20 min-h-[70vh] flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 zkp-grid-pattern -z-10 opacity-70"></div>
      <div className="absolute inset-0 bg-gradient-radial from-transparent to-background -z-10"></div>
      
      {/* Floating icons */}
      <div className="absolute right-[15%] top-[15%] text-primary/20 animate-float opacity-70">
        <LockKeyhole size={64} className="animate-spin-slow" />
      </div>
      <div className="absolute left-[10%] bottom-[20%] text-primary/20 animate-float animation-delay-2000 opacity-60">
        <KeyRound size={48} />
      </div>
      <div className="absolute right-[20%] bottom-[15%] text-primary/30 animate-float animation-delay-1000">
        <Fingerprint size={56} />
      </div>
      
      {/* Hero content */}
      <div className="flex flex-col items-center justify-center text-center max-w-4xl gap-6 px-4 z-10">
        <Badge variant="outline" className="px-4 py-1 animate-fade-up" style={{ "--index": "0" } as React.CSSProperties}>
          Privacy-First Authentication
        </Badge>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight animate-fade-up" style={{ "--index": "1" } as React.CSSProperties}>
          Secure Authentication <span className="zkp-gradient-text">Without Exposing</span> Your Credentials
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl animate-fade-up" style={{ "--index": "2" } as React.CSSProperties}>
          Zero-Knowledge Proof authentication on the Internet Computer blockchain. 
          Verify identity without revealing sensitive information.
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center mt-2 animate-fade-up" style={{ "--index": "3" } as React.CSSProperties}>
          <Button size="lg" className="rounded-full">
            Try Demo
          </Button>
          <Button size="lg" variant="outline" className="rounded-full">
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
}
