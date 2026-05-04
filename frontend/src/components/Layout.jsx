import { Outlet } from 'react-router-dom';
import Header from './Header';
import { Sidebar, BottomNav } from './Navigation';

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
