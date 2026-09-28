# StockMaster AI - Use Case Diagram

The following use case diagram illustrates the roles and capabilities of actors (Admin, Manager, Employee, and the AI Agent) interacting with the StockMaster AI backend system.

```mermaid
flowchart LR
    %% Actors
    subgraph Actors [System Actors]
        Employee["👤 Employee"]
        Manager["👔 Manager"]
        Admin["👑 Admin"]
        AIActor["🤖 AI Assistant"]
    end

    %% Hierarchy
    Admin ---|> Manager
    Manager ---|> Employee

    %% Use Cases Boundary
    subgraph System ["StockMaster AI Platform"]
        %% Authentication
        subgraph AuthUC ["Authentication & Account"]
            UC_Register(["Register Account"])
            UC_Login(["Login / JWT Refresh"])
            UC_Logout(["Logout / Token Revoke"])
            UC_Profile(["View Profile (Me)"])
        end

        %% Inventory Management
        subgraph InventoryUC ["Stock & Catalog Management"]
            UC_ViewStock(["View Stock & Search Products"])
            UC_ViewLowStock(["View Low Stock Alerts"])
            UC_RecordMovement(["Record Stock Movement (IN/OUT/ADJUST)"])
            UC_ManageProducts(["Create/Update Products"])
            UC_DeleteProducts(["Delete Products (Admin only)"])
            UC_ManageCategories(["Manage Categories"])
            UC_ManageSuppliers(["Manage Suppliers"])
        end

        %% AI Interaction & Function Calling
        subgraph AIUC ["AI Agent & Intelligence"]
            UC_ChatAI(["Chat with AI Agent"])
            UC_AskProducts(["Ask AI about Products & Availability"])
            UC_AskSuppliers(["Ask AI about Suppliers"])
            UC_AskMovements(["Ask AI about Stock History & Movements"])
            UC_ToolExecution(["AI Function / Tool Calling"])
            UC_Guardrails(["Prompt Injection & Guardrail Checks"])
        end
    end

    %% Actor Connections
    Employee --> UC_Login
    Employee --> UC_Logout
    Employee --> UC_Profile
    Employee --> UC_ViewStock
    Employee --> UC_ViewLowStock
    Employee --> UC_RecordMovement
    Employee --> UC_ChatAI

    Manager --> UC_ManageProducts
    Manager --> UC_ManageCategories
    Manager --> UC_ManageSuppliers

    Admin --> UC_Register
    Admin --> UC_DeleteProducts

    UC_ChatAI -.->|includes| UC_Guardrails
    UC_ChatAI --> UC_AskProducts
    UC_ChatAI --> UC_AskSuppliers
    UC_ChatAI --> UC_AskMovements

    UC_AskProducts -.->|triggers| UC_ToolExecution
    UC_AskSuppliers -.->|triggers| UC_ToolExecution
    UC_AskMovements -.->|triggers| UC_ToolExecution

    AIActor --> UC_ToolExecution
    UC_ToolExecution -.->|reads via Sequelize| InventoryUC
```

### Role-Based Access Control Summary

| Capability | Employee | Manager | Admin |
| :--- | :---: | :---: | :---: |
| Register New User | ❌ | ❌ | ✅ |
| Login / Refresh / Logout | ✅ | ✅ | ✅ |
| View Products / Categories / Suppliers | ✅ | ✅ | ✅ |
| View Stock Movements | ✅ | ✅ | ✅ |
| Record Stock Movement (IN / OUT) | ✅ | ✅ | ✅ |
| Create / Edit Products & Categories | ❌ | ✅ | ✅ |
| Create / Edit Suppliers | ❌ | ✅ | ✅ |
| Delete Products / Categories / Suppliers | ❌ | ❌ | ✅ |
| Chat with AI Agent | ✅ | ✅ | ✅ |
| AI Tool Calling (Read Stock/Products) | ✅ | ✅ | ✅ |
| AI Audit Log Inspection | ❌ | ❌ | ✅ |
