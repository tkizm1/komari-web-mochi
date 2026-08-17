import { LiveDataProvider } from "@/contexts/LiveDataContext";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import { Outlet } from "react-router-dom";
import { NodeListProvider } from "@/contexts/NodeListContext";

const InnerLayout = () => {
  return (
    <>
      <div className="layout flex flex-col w-full min-h-screen bg-accent-1">
        <NavBar />
        <main className="main-content m-1 flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </>
  );
};

const IndexLayout = () => {
  return (
    <LiveDataProvider>
      <NodeListProvider>
        <InnerLayout />
      </NodeListProvider>
    </LiveDataProvider>
  );
};

export default IndexLayout;
