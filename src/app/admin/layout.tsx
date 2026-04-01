// TODO: Step 6 实现 Admin 布局
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* TODO: AdminSidebar + AdminHeader */}
      <main>{children}</main>
    </div>
  );
}
