# StockMaster AI - Class Diagram

The following class diagram represents the domain model and AI integration architecture of the StockMaster AI backend.
In accordance with the project specifications, it focuses on the core inventory entities and function-calling AI components (without vector embeddings or notification tables).

```mermaid
classDiagram
    direction TB

    class User {
        +Integer id
        +String fullName
        +String email
        +String password
        +Role role
        +DateTime createdAt
        +DateTime updatedAt
        +comparePassword(candidatePassword) Boolean
    }

    class Role {
        <<enumeration>>
        admin
        manager
        employee
    }

    class RefreshToken {
        +Integer id
        +String token
        +Integer userId
        +DateTime expiresAt
        +Boolean revoked
        +DateTime createdAt
        +DateTime updatedAt
        +isExpired() Boolean
    }

    class Category {
        +Integer id
        +String name
        +String description
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Supplier {
        +Integer id
        +String name
        +String phone
        +String email
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Product {
        +Integer id
        +String name
        +String reference
        +String description
        +Decimal price
        +Integer quantity
        +Integer minStock
        +Integer categoryId
        +Integer supplierId
        +DateTime createdAt
        +DateTime updatedAt
        +isLowStock() Boolean
    }

    class MovementType {
        <<enumeration>>
        IN
        OUT
        ADJUSTMENT
    }

    class StockMovement {
        +Integer id
        +Integer productId
        +Integer userId
        +MovementType type
        +Integer quantity
        +String reason
        +DateTime date
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Conversation {
        +Integer id
        +Integer userId
        +String title
        +DateTime createdAt
        +DateTime updatedAt
    }

    class MessageRole {
        <<enumeration>>
        user
        assistant
        system
        tool
    }

    class Message {
        +Integer id
        +Integer conversationId
        +MessageRole role
        +String textContent
        +DateTime createdAt
        +DateTime updatedAt
    }

    class AIAgent {
        +String model
        +Float temperature
        +processChat(userId, conversationId, userMessage, stream) Promise
        +executeFunctionCall(toolCall, userContext) Promise
    }

    class AITool {
        +String name
        +String description
        +Object parameterSchema
        +Array~String~ requiredRoles
        +execute(parameters, userContext) Promise
    }

    %% Relationships
    User "1" --> "*" RefreshToken : owns
    User "1" --> "*" StockMovement : records
    User "1" --> "*" Conversation : participates_in
    User ..> Role : assigned

    Category "1" --> "*" Product : classifies
    Supplier "1" --> "*" Product : supplies

    Product "1" --> "*" StockMovement : tracks

    StockMovement ..> MovementType : classified_by

    Conversation "1" --> "*" Message : contains
    Message ..> MessageRole : categorizes

    AIAgent ..> AITool : invokes
    AIAgent ..> Conversation : manages
    AITool ..> Product : queries
    AITool ..> Category : queries
    AITool ..> Supplier : queries
    AITool ..> StockMovement : queries
```
