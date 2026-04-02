import { ToastContainer } from "react-toastify";
import { Dashboard } from "./components/layout/Dashboard";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function App() {
  return (
    <>
      <Dashboard />
      <ToastContainer
        position="top-right"
        autoClose={4200}
        closeOnClick
        pauseOnHover
        theme="light"
      />
    </>
  );
}

export default App;
