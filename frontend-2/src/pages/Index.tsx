
import React from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { AuthForm } from "@/components/AuthForm";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-16">
        <Hero />
        
        <section id="auth" className="py-20 bg-gradient-to-b from-background to-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Try Our Demo</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Experience zero-knowledge authentication with our interactive demo
              </p>
            </div>
            
            <div className="max-w-md mx-auto">
              <AuthForm />
            </div>
          </div>
        </section>
        
        <div id="features">
          <Features />
        </div>
        
        <div id="how-it-works">
          <HowItWorks />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
