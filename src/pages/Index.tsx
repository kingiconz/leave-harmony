import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarDays, Workflow, BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-primary/5 to-background flex flex-col">

      {/* NAVBAR */}
      <nav className="h-14 sm:h-16 border-b bg-card/80 backdrop-blur flex items-center shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/favicon.ico" className="h-10 w-10 sm:h-14 sm:w-14" />
            <span className="font-montserrat text-lg sm:text-2xl font-bold text-primary">
              LeaveTrack
            </span>
          </div>
          <Button asChild size="sm">
            <Link to="/staff/login">Staff Login</Link>
          </Button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-0">

        {/* Mobile: phone-style card layout */}
        <div className="w-full max-w-sm sm:hidden flex flex-col items-center text-center">
          <div className="w-full rounded-3xl border border-border bg-card shadow-2xl overflow-hidden mb-8">
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71"
              alt="HR analytics dashboard"
              className="w-full h-48 object-cover"
            />
            <div className="p-6 space-y-4">
              <h1 className="text-2xl font-bold text-primary font-montserrat leading-tight">
                Leave<br />Management
              </h1>
              <p className="text-sm text-muted-foreground font-montserrat">
                A centralized platform for submitting, reviewing, and managing employee leave requests while maintaining clear visibility of workforce availability.
              </p>
              <Button asChild className="w-full rounded-full" size="lg">
                <Link to="/staff/login">Get Started</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full font-montserrat text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <CalendarDays className="text-primary flex-shrink-0 h-5 w-5" />
              Leave Calendar
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Workflow className="text-primary flex-shrink-0 h-5 w-5" />
              Approval Flow
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <BarChart3 className="text-primary flex-shrink-0 h-5 w-5" />
              HR Insights
            </div>
          </div>
        </div>

        {/* Desktop: two-column layout */}
        <div className="hidden sm:grid max-w-7xl mx-auto lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary leading-tight mb-6 font-montserrat">
              Leave<br />Management System
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg font-montserrat">
              A centralized platform for submitting, reviewing, and managing employee leave requests while maintaining clear visibility of workforce availability.
            </p>
            <Button asChild size="lg">
              <Link to="/staff/login">Request Leave</Link>
            </Button>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 mt-10 font-montserrat">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="text-primary flex-shrink-0" />
                Leave Calendar
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Workflow className="text-primary flex-shrink-0" />
                Approval Flow
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="text-primary flex-shrink-0" />
                HR Insights
              </div>
            </div>
          </div>
          <div className="rounded-2xl border shadow-xl overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71"
              alt="HR analytics dashboard"
              className="w-full object-cover"
            />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="h-12 border-t flex items-center justify-center px-4 sm:px-6 text-sm text-muted-foreground font-montserrat shrink-0">
        © {new Date().getFullYear()} LeaveTrack
      </footer>
    </div>
  );
};

export default Index;
