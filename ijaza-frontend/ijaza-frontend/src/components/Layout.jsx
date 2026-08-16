import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      <Sidebar />
      <main className="flex-1 p-10">{children}</main>
    </div>
  );
}
