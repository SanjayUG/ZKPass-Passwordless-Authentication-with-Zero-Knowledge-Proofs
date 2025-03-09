
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export function AuthForm() {
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // These would be connected to your Internet Computer backend in a real implementation
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Registration successful",
        description: `User ${username} registered with ZKP`,
      });
      setLoading(false);
    }, 1500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Authentication successful",
        description: `Welcome back, ${username}`,
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="authentication-container animate-fade-in">
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Login securely</CardTitle>
              <CardDescription className="text-center">
                Authenticate with zero-knowledge proof
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="secret">Secret Number</Label>
                    <Input
                      id="secret"
                      type="password" 
                      placeholder="Enter your secret number"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full mt-4" disabled={loading}>
                    {loading ? "Verifying..." : "Login"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Create an account</CardTitle>
              <CardDescription className="text-center">
                Register with zero-knowledge proof
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-username">Username</Label>
                    <Input
                      id="new-username"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-secret">Secret Number</Label>
                    <Input
                      id="new-secret"
                      type="password"
                      placeholder="Choose a secret number"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      This will be used for ZKP authentication
                    </p>
                  </div>
                  <Button type="submit" className="w-full mt-4" disabled={loading}>
                    {loading ? "Creating..." : "Register"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
