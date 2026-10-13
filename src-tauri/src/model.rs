use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub type Props = BTreeMap<String, serde_json::Value>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ComponentType {
    #[serde(rename = "JLabel")]
    #[serde(alias = "label")]
    #[serde(alias = "jlabel")]
    JLabel,
    #[serde(rename = "JButton")]
    #[serde(alias = "button")]
    #[serde(alias = "jbutton")]
    JButton,
    #[serde(rename = "JTextField")]
    #[serde(alias = "textfield")]
    #[serde(alias = "jtextfield")]
    JTextField,
    #[serde(rename = "JPasswordField")]
    #[serde(alias = "passwordfield")]
    #[serde(alias = "jpasswordfield")]
    JPasswordField,
    #[serde(rename = "JTextArea")]
    #[serde(alias = "textarea")]
    #[serde(alias = "jtextarea")]
    JTextArea,
    #[serde(rename = "JCheckBox")]
    #[serde(alias = "checkbox")]
    #[serde(alias = "jcheckbox")]
    JCheckBox,
    #[serde(rename = "JRadioButton")]
    #[serde(alias = "radiobutton")]
    #[serde(alias = "jradiobutton")]
    JRadioButton,
    #[serde(rename = "JComboBox")]
    #[serde(alias = "combobox")]
    #[serde(alias = "jcombobox")]
    JComboBox,
    #[serde(rename = "JList")]
    #[serde(alias = "list")]
    #[serde(alias = "jlist")]
    JList,
    #[serde(rename = "JTable")]
    #[serde(alias = "table")]
    #[serde(alias = "jtable")]
    JTable,
    #[serde(rename = "JPanel")]
    #[serde(alias = "panel")]
    #[serde(alias = "jpanel")]
    JPanel,
    #[serde(rename = "JScrollPane")]
    #[serde(alias = "scrollpane")]
    #[serde(alias = "jscrollpane")]
    JScrollPane,
    #[serde(rename = "JProgressBar")]
    #[serde(alias = "progressbar")]
    #[serde(alias = "jprogressbar")]
    JProgressBar,
    #[serde(rename = "JSpinner")]
    #[serde(alias = "spinner")]
    #[serde(alias = "jspinner")]
    JSpinner,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum SqlType {
    Integer,
    Text,
    Real,
    Blob,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnSpec {
    pub name: String,
    #[serde(rename = "type")]
    pub col_type: SqlType,
    pub pk: bool,
    pub not_null: bool,
    pub auto_increment: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableSpec {
    pub name: String,
    pub columns: Vec<ColumnSpec>,
    pub seed_rows: Vec<BTreeMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseSpec {
    pub file: String,
    pub tables: Vec<TableSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentSpec {
    pub id: String,
    #[serde(rename = "type")]
    pub comp_type: ComponentType,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    #[serde(default)]
    pub props: Props,
    pub parent_id: Option<String>,
}

impl ComponentSpec {
    pub fn prop_str(&self, key: &str, default: &str) -> String {
        match self.props.get(key) {
            Some(serde_json::Value::String(s)) => s.clone(),
            Some(serde_json::Value::Number(n)) => n.to_string(),
            Some(serde_json::Value::Bool(b)) => b.to_string(),
            _ => default.to_string(),
        }
    }

    pub fn prop_bool(&self, key: &str, default: bool) -> bool {
        match self.props.get(key) {
            Some(serde_json::Value::Bool(b)) => *b,
            Some(serde_json::Value::String(s)) => s == "true",
            Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(0.0) != 0.0,
            _ => default,
        }
    }

    pub fn prop_num(&self, key: &str, default: f64) -> f64 {
        match self.props.get(key) {
            Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(default),
            Some(serde_json::Value::String(s)) => s.parse().unwrap_or(default),
            _ => default,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowSpec {
    pub id: String,
    pub title: String,
    pub width: f64,
    pub height: f64,
    pub components: Vec<ComponentSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ParamRole {
    Set,
    Where,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum QueryOperator {
    #[serde(rename = "=")]
    Eq,
    #[serde(rename = ">")]
    Gt,
    #[serde(rename = "<")]
    Lt,
    #[serde(rename = ">=")]
    Gte,
    #[serde(rename = "<=")]
    Lte,
    #[serde(rename = "LIKE")]
    Like,
}

impl QueryOperator {
    pub fn as_sql(&self) -> &'static str {
        match self {
            QueryOperator::Eq => "=",
            QueryOperator::Gt => ">",
            QueryOperator::Lt => "<",
            QueryOperator::Gte => ">=",
            QueryOperator::Lte => "<=",
            QueryOperator::Like => "LIKE",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParamSpec {
    pub column: String,
    pub from_component_id: String,
    pub role: ParamRole,
    pub operator: QueryOperator,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionKind {
    Message,
    OpenWindow,
    Authenticate,
    Insert,
    Update,
    Delete,
    Query,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSpec {
    pub id: String,
    pub name: String,
    pub component_id: String,
    pub event: String,
    pub kind: ConnectionKind,
    pub table: String,
    #[serde(default)]
    pub params: Vec<ParamSpec>,
    #[serde(default)]
    pub query_columns: Vec<QueryColumn>,
    pub target_table_component_id: String,
    pub open_window_id: String,
    pub close_current: bool,
    pub message: String,
    pub message_title: String,
    pub message_kind: String,
    pub auth_success_window_id: String,
    pub custom_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryColumn {
    pub column: String,
    pub header: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppModel {
    pub schema_version: u32,
    pub name: String,
    pub package_name: String,
    pub main_window_id: String,
    pub windows: Vec<WindowSpec>,
    pub database: DatabaseSpec,
    pub connections: Vec<ConnectionSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub kind: String,
    pub template_name: String,
    pub created_at: String,
    pub last_opened_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeNode {
    pub name: String,
    pub path: String,
    pub kind: String,
    pub ext: Option<String>,
    #[serde(default)]
    pub children: Vec<TreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub language: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Problem {
    pub severity: String,
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub component_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub window_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodegenResult {
    pub files: Vec<String>,
    pub warnings: Vec<String>,
}
