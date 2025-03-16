
import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, LogOut, Key, Clock, ChevronRight, RefreshCw } from "lucide-react";

const Dashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    setLoading(true);
    setTimeout(() => {
      setIsAuthenticated(false);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-3xl font-bold">Authentication Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage your ZKP authentication and view your status
            </p>
          </div>
          
          {isAuthenticated ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Authentication Status</CardTitle>
                        <CardDescription>Your current authentication status</CardDescription>
                      </div>
                      <Badge className="bg-green-500" variant="secondary">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
                          <Shield className="text-primary w-8 h-8" />
                          <div>
                            <p className="text-sm text-muted-foreground">Authentication Method</p>
                            <p className="font-medium">Zero-Knowledge Proof</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
                          <Clock className="text-primary w-8 h-8" />
                          <div>
                            <p className="text-sm text-muted-foreground">Last Authentication</p>
                            <p className="font-medium">Just now</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
                        <Key className="text-primary w-8 h-8" />
                        <div className="flex-grow">
                          <p className="text-sm text-muted-foreground">Public Key</p>
                          <p className="font-mono text-sm truncate">
                            2vxsx-fae.d26vl-wybpf-aeiv5-e7kct-t56j7-sbwlg-gtu4y-h5pmy-o5vcm-pqe
                          </p>
                        </div>
                      </div>
                      
                      <Button variant="outline" className="w-full" onClick={handleLogout} disabled={loading}>
                        {loading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Logging out...
                          </>
                        ) : (
                          <>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest authentication events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { event: "Login", time: "Just now" },
                        { event: "Registration", time: "1 day ago" },
                      ].map((activity, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{activity.event}</p>
                            <p className="text-sm text-muted-foreground">{activity.time}</p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="max-w-md mx-auto animate-fade-in">
              <CardHeader>
                <CardTitle className="text-center">Not Authenticated</CardTitle>
                <CardDescription className="text-center">
                  You need to login to view your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button onClick={() => setIsAuthenticated(true)}>Go to Login</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
