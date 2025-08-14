"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import { useLocation, useNavigate } from "react-router"
import { Button } from "~/components/ui/button"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "~/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: Icon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const location = useLocation();
  const navigate = useNavigate();
  const [loadingItems, setLoadingItems] = React.useState<{[key: string]: boolean}>({});

  const handleItemClick = React.useCallback((url: string) => {
    setLoadingItems(prev => ({ ...prev, [url]: true }));
    navigate(url);
  }, [navigate]);

  // Clear loading state when navigation completes
  React.useEffect(() => {
    setLoadingItems({});
  }, [location.pathname]);

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.url ||
                           (item.url.startsWith("/dashboard") && location.pathname.startsWith(item.url));
            const isImplemented = item.url !== "#";
            
            return (
              <SidebarMenuItem key={item.title}>
                {isImplemented ? (
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    loading={loadingItems[item.url]}
                    onClick={() => handleItemClick(item.url)}
                    className="w-full justify-start h-8 px-2"
                  >
                    <item.icon size={16} className="mr-2" />
                    <span>{item.title}</span>
                  </Button>
                ) : (
                  <Button 
                    disabled 
                    variant="ghost"
                    className="w-full justify-start h-8 px-2"
                  >
                    <item.icon size={16} className="mr-2" />
                    <span>{item.title}</span>
                  </Button>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
