
import React from "react";
import { Card } from "@/components/ui/card";
import { Shield, Lock, KeyRound, Database, Code, Sparkles } from "lucide-react";

export function Features() {
  const features = [
    {
      title: "Zero-Knowledge Proofs",
      description: "Authenticate without revealing your actual credentials",
      icon: <Shield className="w-10 h-10 text-primary" />,
    },
    {
      title: "Blockchain-Based",
      description: "Public keys stored securely on the Internet Computer blockchain",
      icon: <Database className="w-10 h-10 text-primary" />,
    },
    {
      title: "Privacy-First",
      description: "Complete protection of sensitive user information",
      icon: <Lock className="w-10 h-10 text-primary" />,
    },
    {
      title: "API Integration",
      description: "Simple integration with existing websites and applications",
      icon: <Code className="w-10 h-10 text-primary" />,
    },
    {
      title: "Decentralized Trust",
      description: "No central authority or single point of failure",
      icon: <KeyRound className="w-10 h-10 text-primary" />,
    },
    {
      title: "Enhanced Security",
      description: "Cryptographic verification without password transmission",
      icon: <Sparkles className="w-10 h-10 text-primary" />,
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold mb-4">Key Features</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Our authentication system combines cutting-edge cryptography with blockchain technology
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <Card key={index} className="feature-card" style={{ "--index": index } as React.CSSProperties}>
            <div className="flex flex-col gap-4">
              <div className="p-3 rounded-lg bg-primary/10 w-fit">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
