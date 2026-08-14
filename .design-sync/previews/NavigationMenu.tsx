import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "nixvet-ui";

export const Open = () => (
  <NavigationMenu viewport={false} defaultValue="settings">
    <NavigationMenuList>
      <NavigationMenuItem value="settings">
        <NavigationMenuTrigger>Configurações</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className="grid w-48 gap-1 p-1">
            <li>
              <NavigationMenuLink href="#">Produtos</NavigationMenuLink>
            </li>
            <li>
              <NavigationMenuLink href="#">Equipe</NavigationMenuLink>
            </li>
            <li>
              <NavigationMenuLink href="#">Faturamento</NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink href="#">Pacientes</NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
);
