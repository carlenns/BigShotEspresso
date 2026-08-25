import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";
import Dashboard from "@/pages/Dashboard";
import ShotList from "@/pages/ShotList";
import ShotForm from "@/pages/ShotForm";
import ShotDetail from "@/pages/ShotDetail";
import ReferenceShots from "@/pages/ReferenceShots";
import Settings from "@/pages/Settings";
import Beans from "@/pages/Beans";
import BeanForm from "@/pages/BeanForm";
import Bags from "@/pages/Bags";
import BagDetail from "@/pages/BagDetail";
import Equipment from "@/pages/Equipment";
import Accessories from "@/pages/Accessories";
import TasteSelectors from "@/pages/TasteSelectors";

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/shots" component={ShotList} />
        {/* Quick Log is shelved for launch (docs/implementation/release-candidate-checklist.md
            Gate 0.5). Redirect the old route to the primary Log Shot workflow
            instead of rendering it, so a stale bookmark/link can't land a
            user on an unsupported alternate logging path. QuickLog.tsx is
            intentionally left in place, unimported here, per the "prefer
            routing/copy cleanup over destructive removal" project rule. */}
        <Route path="/shots/quick">
          <Redirect to="/shots/new" />
        </Route>
        <Route path="/shots/new" component={ShotForm} />
        <Route path="/shots/:id/edit" component={ShotForm} />
        <Route path="/shots/:id" component={ShotDetail} />
        <Route path="/reference" component={ReferenceShots} />
        <Route path="/beans/new" component={BeanForm} />
        <Route path="/beans/:id/edit" component={BeanForm} />
        <Route path="/beans" component={Beans} />
        <Route path="/bags" component={Bags} />
        <Route path="/bags/:id" component={BagDetail} />
        <Route path="/equipment" component={Equipment} />
        <Route path="/accessories" component={Accessories} />
        <Route path="/taste-selectors" component={TasteSelectors} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
