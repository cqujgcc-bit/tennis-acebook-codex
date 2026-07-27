import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CoachList from "./pages/CoachList";
import CoachDetail from "./pages/CoachDetail";
import CoachShare from "./pages/CoachShare";
import BookingFlow from "./pages/BookingFlow";
import MyBookings from "./pages/MyBookings";
import BookingDetail from "./pages/BookingDetail";
import Notifications from "./pages/Notifications";
import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachCalendar from "./pages/coach/CoachCalendar";
import CoachStudents from "./pages/coach/CoachStudents";
import CoachEarnings from "./pages/coach/CoachEarnings";
import CoachProfileEdit from "./pages/coach/CoachProfileEdit";
import CoachPromotion from "./pages/coach/CoachPromotion";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PartnerVenueAdmin from "./pages/admin/PartnerVenueAdmin";
import Login from "./pages/Login";
import BecomeCoach from "./pages/BecomeCoach";
import MatchList from "./pages/MatchList";
import MatchDetail from "./pages/MatchDetail";
import CreateMatch from "./pages/CreateMatch";
import MyPackages from "./pages/MyPackages";
import Profile from "./pages/Profile";

function Router() {
  return (
    <Switch>
      {/* Auth */}
      <Route path="/login" component={Login} />

      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/coaches" component={CoachList} />
      <Route path="/coaches/:id" component={CoachDetail} />
      <Route path="/coach/:slug" component={CoachShare} />

      {/* Student */}
      <Route path="/book/:coachId" component={BookingFlow} />
      <Route path="/my-bookings" component={MyBookings} />
      <Route path="/bookings/:id" component={BookingDetail} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/become-coach" component={BecomeCoach} />
      <Route path="/matches" component={MatchList} />
      <Route path="/matches/create" component={CreateMatch} />
      <Route path="/matches/:id" component={MatchDetail} />
      <Route path="/my-packages" component={MyPackages} />
      <Route path="/profile" component={Profile} />

      {/* Coach */}
      <Route path="/coach-dashboard" component={CoachDashboard} />
      <Route path="/coach-calendar" component={CoachCalendar} />
      <Route path="/coach-students" component={CoachStudents} />
      <Route path="/coach-earnings" component={CoachEarnings} />
      <Route path="/coach-profile" component={CoachProfileEdit} />
      <Route path="/coach-promotion" component={CoachPromotion} />

      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/partner-venues" component={PartnerVenueAdmin} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
