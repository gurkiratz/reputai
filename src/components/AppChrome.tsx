"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import { SideNav, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Inbox, BarChart3, Megaphone, FileText, MapPin, Stethoscope, Link2 } from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inbox", icon: Inbox },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const SETTINGS_ITEMS = [
  { href: "/settings/brand-voice", label: "Brand voice", icon: Megaphone },
  { href: "/settings/templates", label: "Templates", icon: FileText },
  { href: "/settings/locations", label: "Locations", icon: MapPin },
  { href: "/settings/google", label: "Google", icon: Link2 },
];

export function AppChrome({
  userName,
  userRole,
  children,
}: {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AppShell
      contentPadding={6}
      topNav={
        <TopNav
          label="Main navigation"
          heading={
            <TopNavHeading
              heading="Review Ops Platform"
              logo={<NavIcon icon={<Icon icon={Stethoscope} size="sm" />} />}
            />
          }
          endContent={
            <HStack gap={3} align="center">
              <Text type="supporting" size="sm">
                {userName} · {userRole}
              </Text>
              <form action={signOutAction}>
                <Button type="submit" label="Sign out" variant="ghost" size="sm" />
              </form>
            </HStack>
          }
        />
      }
      sideNav={
        <SideNav>
          <SideNavSection title="Overview" isHeaderHidden>
            {NAV_ITEMS.map((item) => (
              <SideNavItem
                key={item.href}
                as={NextLink}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isSelected={pathname === item.href}
              />
            ))}
          </SideNavSection>
          <SideNavSection title="Settings">
            {SETTINGS_ITEMS.map((item) => (
              <SideNavItem
                key={item.href}
                as={NextLink}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isSelected={pathname === item.href}
              />
            ))}
          </SideNavSection>
        </SideNav>
      }
    >
      {children}
    </AppShell>
  );
}
