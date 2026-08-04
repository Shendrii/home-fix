"use client";

import { Bell } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationMenu() {
  const { notifications, markNotificationRead } = useApp();
  const unread = notifications.filter((notification) => !notification.read);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="tap-target relative rounded-xl text-slate-600 hover:bg-white hover:text-slate-900"
            aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ""}`}
          />
        }
      >
        <Bell className="size-5" strokeWidth={2} />
        {unread.length > 0 && <span className="absolute right-2.5 top-2 size-2 rounded-full bg-orange-500 ring-2 ring-[#faf8f3]" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2">
        <p className="px-2 py-2 text-sm font-bold text-slate-900">Notifications</p>
        <DropdownMenuGroup>
          {notifications.slice(0, 6).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="cursor-pointer items-start rounded-xl px-2 py-2.5"
              onClick={() => void markNotificationRead(notification.id)}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {!notification.read && <span className="size-1.5 rounded-full bg-teal-600" />}
                  {notification.title}
                </span>
                <span className="mt-1 block whitespace-normal text-xs leading-5 text-slate-500">{notification.body}</span>
              </span>
            </DropdownMenuItem>
          ))}
          {!notifications.length && <p className="px-2 py-5 text-center text-sm text-slate-500">You’re all caught up.</p>}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
