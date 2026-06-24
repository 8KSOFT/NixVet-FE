export interface WorkflowConditionBranch {
  value: string;
  target: string;
}

export interface WorkflowActionParams {
  text?: string;
  days_ahead?: number;
  message?: string;
}

export interface WorkflowNodeConfig {
  action_type?: string;
  variable?: string;
  branches?: WorkflowConditionBranch[];
  params?: WorkflowActionParams;
  output_var?: string;
}

export interface WorkflowNodeData extends Record<string, unknown> {
  label?: string;
  config?: WorkflowNodeConfig;
}

export interface BackendNode {
  node_type: string;
  node_key: string;
  label?: string;
  config?: WorkflowNodeConfig;
  position_x?: number;
  position_y?: number;
}

export interface BackendEdge {
  source_node: string;
  target_node: string;
  condition?: string;
}

export interface WorkflowData {
  id: string;
  name: string;
  is_active: boolean;
  nodes: BackendNode[];
  edges: BackendEdge[];
}

export interface WorkflowItem {
  id: string;
  name: string;
  is_active: boolean;
  createdAt?: string;
}
