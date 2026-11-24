import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { NAV_ITEMS, type NavItem } from '@/constants/navigation';
import { ROLE_LABEL } from '@/constants/roles';
import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { AppText } from '@packages/ui/AppText';
import { Icon } from '@packages/ui/Icon';
import { IconButton } from '@packages/ui/IconButton';
import { ProgressBar } from '@packages/ui/ProgressBar';
import { useBreakpoint } from '@packages/responsive/useBreakpoint';

import { styles } from './styles';
import type { PressState } from '@packages/ui/utils/pressState';

type PortalShellProps = { children: ReactNode };

/** Sidebar + top bar frame shared by every admin section (Stitch "JeepTrack Coop Transit Portal"). */
export function PortalShell({ children }: PortalShellProps) {
  const { atLeastLg, isPhone } = useBreakpoint();
  const pathname = usePathname();
  const auth = useAuth();
  // Only the sections this role may use; the backend refuses the rest anyway.
  const items = NAV_ITEMS.filter((item) => auth.can(item.permission));
  const current = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const active = current?.key;
  const allowed = !current || auth.can(current.permission);

  return (
    <View style={styles.root}>
      {atLeastLg ? (
        <View style={styles.sidebar}>
          <Brand />
          <CoopSelector />
          <View accessibilityRole="menu" style={styles.nav}>
            {items.map((item) => (
              <SideNavLink key={item.key} item={item} active={item.key === active} />
            ))}
          </View>
          <GpsSyncCard />
        </View>
      ) : null}
      <View style={styles.main}>
        <TopBar compact={!atLeastLg} phone={isPhone} />
        {!atLeastLg ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.stripScroll}
            contentContainerStyle={styles.strip}>
            {items.map((item) => (
              <StripNavLink key={item.key} item={item} active={item.key === active} />
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.content}>{allowed ? children : <NoAccessPanel label={current?.label ?? ''} />}</View>
      </View>
    </View>
  );
}

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandIcon}>
        <Icon name="directions-bus" size={22} color={colors.onPrimary} />
      </View>
      <View>
        <View style={styles.row}>
          <AppText variant="headlineSm" bold>
            Para
          </AppText>
          <View style={styles.adminTag}>
            <AppText variant="labelSm" color={colors.onPrimary} uppercase>
              Admin
            </AppText>
          </View>
        </View>
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          Coop Transit Portal
        </AppText>
      </View>
    </View>
  );
}

function CoopSelector() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Selected transport coop: Cebu City South CCSTC"
      style={styles.coop}>
      <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
        Selected Transport Coop
      </AppText>
      <View style={styles.coopRow}>
        <View style={[styles.row, styles.shrink]}>
          <Icon name="corporate-fare" size={18} color={colors.secondary} />
          <AppText variant="labelMd" bold numberOfLines={1} style={styles.shrink}>
            Cebu City South CCSTC
          </AppText>
        </View>
        <Icon name="unfold-more" size={18} color={colors.onSurfaceVariant} />
      </View>
    </Pressable>
  );
}

function SideNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.navigate(item.href)}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: active }}
      style={({ hovered }: PressState) => [
        styles.navItem,
        active ? styles.navItemActive : hovered && styles.navItemHover,
      ]}>
      <View style={styles.row}>
        <Icon name={item.icon} size={20} color={active ? colors.onPrimary : colors.onSurfaceVariant} />
        <AppText
          variant={active ? 'headlineSm' : 'labelLg'}
          bold={active}
          color={active ? colors.onPrimary : colors.onSurfaceVariant}>
          {item.label}
        </AppText>
      </View>
      {item.badge ? (
        <View style={[styles.navBadge, active && styles.navBadgeActive]}>
          <AppText variant="labelSm" color={active ? colors.primaryContainer : colors.onSecondaryContainer}>
            {item.badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

function StripNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.navigate(item.href)}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      style={[styles.stripItem, active && styles.navItemActive]}>
      <Icon name={item.icon} size={18} color={active ? colors.onPrimary : colors.onSurfaceVariant} />
      <AppText variant="labelMd" bold={active} color={active ? colors.onPrimary : colors.onSurfaceVariant}>
        {item.label}
      </AppText>
      {item.badge ? (
        <View style={[styles.navBadge, active && styles.navBadgeActive]}>
          <AppText variant="labelSm" color={active ? colors.primaryContainer : colors.onSecondaryContainer}>
            {item.badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

function GpsSyncCard() {
  return (
    <View style={styles.gps}>
      <View style={styles.coopRow}>
        <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
          GPS Grid Sync
        </AppText>
        <View style={styles.row}>
          <View style={styles.liveDot} />
          <AppText variant="labelSm" color={colors.telemetryStrong}>
            99.8%
          </AppText>
        </View>
      </View>
      <ProgressBar value={0.998} />
      <AppText variant="bodySm" color={colors.onSurfaceVariant}>
        Telemetry latency: 240ms
      </AppText>
    </View>
  );
}

function TopBar({ compact, phone }: { compact: boolean; phone: boolean }) {
  const auth = useAuth();
  const displayName = auth.status === 'signedIn' ? (auth.user.displayName ?? auth.user.email ?? 'Admin') : 'Admin';
  return (
    <View style={[styles.topBar, phone && styles.topBarPhone]}>
      <View style={[styles.row, styles.shrink]}>
        {compact ? (
          <View style={styles.brandIconSm}>
            <Icon name="directions-bus" size={18} color={colors.onPrimary} />
          </View>
        ) : null}
        <View style={styles.pill}>
          <View style={styles.pillDot} />
          {phone ? null : (
            <AppText variant="labelMd" bold color={colors.telemetryInk}>
              Active Units:
            </AppText>
          )}
          <AppText variant="headlineSm" bold color={colors.telemetryStrong}>
            24
          </AppText>
        </View>
        {phone ? null : (
          <View style={styles.pill}>
            <Icon name="satellite-alt" size={16} color={colors.telemetryStrong} />
            <AppText variant="labelMd" color={colors.telemetryInk}>
              Live Telemetry:
            </AppText>
            <AppText variant="labelMd" bold color={colors.telemetryStrong}>
              99.8%
            </AppText>
          </View>
        )}
      </View>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications, 3 unread" style={styles.bell}>
          <Icon name="notifications" size={24} color={colors.onSurfaceVariant} />
          <View style={styles.bellBadge}>
            <AppText variant="labelSm" color={colors.onPrimary}>
              3
            </AppText>
          </View>
        </Pressable>
        <View style={styles.divider} />
        {phone ? null : (
          <View style={styles.profileText}>
            <AppText variant="labelLg" bold numberOfLines={1}>
              {/* {displayName} */}
              Alma D.
            </AppText>
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              {auth.status === 'signedIn' && auth.role ? ROLE_LABEL[auth.role] : 'No role'}
            </AppText>
          </View>
        )}
        <View style={styles.avatar}>
          <Icon name="person" size={18} color={colors.onPrimary} />
        </View>
        <IconButton
          icon="logout"
          color={colors.onSurfaceVariant}
          accessibilityLabel={`Sign out ${displayName}`}
          onPress={() => void auth.signOut()}
        />
      </View>
    </View>
  );
}

/** Shown when a role opens a section it may not use (e.g. a fleet user opening /routes by URL). */
function NoAccessPanel({ label }: { label: string }) {
  const router = useRouter();
  return (
    <View style={styles.noAccess}>
      <Icon name="lock" size={32} color={colors.secondary} />
      <AppText variant="headlineLg" bold align="center">
        No access to {label}
      </AppText>
      <AppText variant="bodyMd" color={colors.onSurfaceVariant} align="center">
        Your role does not include this section. Ask a super admin if you need it.
      </AppText>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.noAccessLink}>
        <AppText variant="labelLg" bold color={colors.brand}>
          Go to my home section
        </AppText>
      </Pressable>
    </View>
  );
}
