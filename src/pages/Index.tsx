import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarDays, Workflow, BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <div className="h-screen w-full bg-gradient-to-b from-indigo-50 to-white flex flex-col">

      {/* NAVBAR */}
      <nav className="h-16 border-b bg-white/80 backdrop-blur flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">

          <div className="flex items-center gap-3">
            <img src="/favicon.ico" className="h-14 w-14"/>
            <span className="font-montserrat text-2xl font-bold text-primary">
              LeaveTrack
            </span>
          </div>

          <Button asChild>
            <Link to="/staff/login">Staff Login</Link>
          </Button>

        </div>
      </nav>


      {/* MAIN CONTENT */}
      <main className="flex-1 flex items-center">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">

          {/* LEFT */}
          <div>

            <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 leading-tight mb-6 font-montserrat">
              Leave
              <br />
              Management System
            </h1>

            <p className="text-lg text-slate-600 mb-8 max-w-lg font-montserrat">
              A centralized platform for submitting, reviewing, and managing employee leave requests while maintaining clear visibility of workforce availability.
            </p>

            <Button asChild size="lg">
              <Link to="/staff/login">Request Leave</Link>
            </Button>

            {/* FEATURES */}
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 mt-10 font-montserrat">

              <div className="flex items-center gap-2 text-slate-700">
                <CalendarDays className="text-indigo-600 flex-shrink-0"/>
                Leave Calendar
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <Workflow className="text-indigo-600 flex-shrink-0"/>
                Approval Flow
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <BarChart3 className="text-indigo-600 flex-shrink-0"/>
                HR Insights
              </div>

            </div>

          </div>


          {/* RIGHT PRODUCT IMAGE */}
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
      <footer className="h-12 border-t flex items-center justify-center px-4 sm:px-6 text-sm text-slate-500 font-montserrat">
        © {new Date().getFullYear()} LeaveTrack
      </footer>

    </div>
  );
};

export default Index;