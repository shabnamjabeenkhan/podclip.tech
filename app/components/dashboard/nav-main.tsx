import { memo, useMemo } from "react";
import { type Icon } from "@tabler/icons-react";

import { useLocation, Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";

export const NavMain = memo(({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
  }[];
}) => {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleItemClick = () => {
    // Close mobile sidebar when navigating
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const navItems = useMemo(() =>
    items.map((item) => ({
      ...item,
      isActive: location.pathname === item.url,
    })),
    [items, location.pathname]
  );

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Button
                variant={item.isActive ? "secondary" : "ghost"}
                className="w-full justify-start h-8 px-2"
                asChild
              >
                <Link to={item.url} onClick={handleItemClick}>
                  {item.icon && <item.icon size={16} className="mr-2" />}
                  <span>{item.title}</span>
                </Link>
              </Button>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});
