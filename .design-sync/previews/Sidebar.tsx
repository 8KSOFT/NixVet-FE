import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "nixvet-ui";

export const Default = () => (
  <SidebarProvider defaultOpen>
    <Sidebar collapsible="none" className="h-[520px]">
      <SidebarHeader>
        <div className="px-2 text-sm font-semibold">NixVet</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Clínica</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive>Pacientes</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Agenda</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Financeiro</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 text-xs text-muted-foreground">
          Ana Souza — Recepção
        </div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset>
      <div className="p-6 text-sm text-muted-foreground">
        Conteúdo principal da página.
      </div>
    </SidebarInset>
  </SidebarProvider>
);
