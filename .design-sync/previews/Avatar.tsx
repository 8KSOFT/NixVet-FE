import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "nixvet-ui";

export const Sizes = () => (
  <div className="flex items-center gap-4">
    <Avatar size="sm">
      <AvatarFallback>AS</AvatarFallback>
    </Avatar>
    <Avatar size="default">
      <AvatarFallback>AS</AvatarFallback>
    </Avatar>
    <Avatar size="lg">
      <AvatarFallback>AS</AvatarFallback>
    </Avatar>
  </div>
);

export const WithBadge = () => (
  <Avatar size="lg">
    <AvatarFallback>AS</AvatarFallback>
    <AvatarBadge>3</AvatarBadge>
  </Avatar>
);

export const Group = () => (
  <AvatarGroup>
    <Avatar>
      <AvatarFallback>AS</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>JP</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>MR</AvatarFallback>
    </Avatar>
    <AvatarGroupCount>+4</AvatarGroupCount>
  </AvatarGroup>
);
