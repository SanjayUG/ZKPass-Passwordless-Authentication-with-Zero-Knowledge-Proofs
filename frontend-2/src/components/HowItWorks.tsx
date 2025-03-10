
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Key, Lock, CheckCircle } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      title: "Register",
      description: "Create an account with a username and secret number",
      icon: <UserPlus className="w-8 h-8" />,
    },
    {
      title: "Generate ZKP",
      description: "A zero-knowledge proof is generated from your credentials",
      icon: <Key className="w-8 h-8" />,
    },
    {
      title: "Secure Storage",
      description: "Public key stored on Internet Computer blockchain",
      icon: <Lock className="w-8 h-8" />,
    },
    {
      title: "Authenticate",
      description: "Verify identity without revealing your secret",
      icon: <CheckCircle className="w-8 h-8" />,
    },
  ];

  return (
    <section className="py-24 bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Simple, secure, and private authentication in four easy steps
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-primary/20 transform -translate-x-1/2 hidden md:block"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
            {steps.map((step, index) => (
              <div key={index} className={`${index % 2 === 0 ? 'md:mr-12' : 'md:ml-12 md:mt-24'}`}>
                <Card className="relative glass-panel overflow-visible">
                  <div className="absolute top-1/2 transform -translate-y-1/2 
                                  right-0 md:right-auto md:left-0
                                  translate-x-1/2 md:translate-x-0 md:-translate-x-1/2
                                  w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center z-10
                                  shadow-lg">
                    {step.icon}
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}