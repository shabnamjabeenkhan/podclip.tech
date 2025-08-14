import { memo, useMemo, useState, useCallback, useEffect } from "react";
import { type Icon } from "@tabler/icons-react";

import { useLocation, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
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
  const navigate = useNavigate();
  const [loadingItems, setLoadingItems] = useState<{[key: string]: boolean}>({});

  const handleItemClick = useCallback((url: string) => {
    setLoadingItems(prev => ({ ...prev, [url]: true }));
    navigate(url);
  }, [navigate]);

  const navItems = useMemo(() => 
    items.map((item) => ({
      ...item,
      isActive: location.pathname === item.url,
    })), 
    [items, location.pathname]
  );

  // Clear loading state when navigation completes
  useEffect(() => {
    setLoadingItems({});
  }, [location.pathname]);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Button
                variant={item.isActive ? "secondary" : "ghost"}
                loading={loadingItems[item.url]}
                onClick={() => handleItemClick(item.url)}
                className="w-full justify-start h-8 px-2"
              >
                {item.icon && <item.icon size={16} className="mr-2" />}
                <span>{item.title}</span>
              </Button>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});
