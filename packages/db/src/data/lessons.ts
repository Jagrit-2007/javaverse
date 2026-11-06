/**
 * JavaVerse Launch Curriculum: 12 Complete Authoritative Lessons
 * Tracks: Foundations (3), OOP (3), DSA (3), Advanced Java (3)
 * Specification: Part S and BLUEPRINT §5.8 / §K7
 */

export interface LessonData {
  slug: string;
  title: string;
  track: 'foundations' | 'oop' | 'dsa' | 'advanced_java';
  module: string;
  orderIndex: number;
  published: boolean;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  estimatedMinutes: number;
  hook: string;
  contentSimple: string;
  contentStandard: string;
  contentDeep: string;
  visualization: Record<string, unknown>;
  codeStarter: string;
  codeSolution: string;
  commonMistakes: Array<{
    mistake: string;
    explanation: string;
    badCode?: string;
    goodCode?: string;
  }>;
  quiz: Array<{
    id: string;
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }>;
  challenge: {
    prompt: string;
    starterCode: string;
    solutionCode: string;
    testCode: string;
    hints: string[];
  };
  javaVersion: string;
  metadata: {
    author: string;
    license: string;
    source: string;
    reviewStatus: 'REVIEWED' | 'DRAFT';
    lastReviewedAt: string;
  };
}

export const LAUNCH_LESSONS: LessonData[] = [
  // ===========================================================================
  // 1. FOUNDATIONS: primitive-types
  // ===========================================================================
  {
    slug: 'primitive-types',
    title: 'Java Primitive Types & Memory Layout',
    track: 'foundations',
    module: 'Types & Variables',
    orderIndex: 1,
    published: true,
    difficulty: 'EASY',
    estimatedMinutes: 15,
    hook: 'Imagine physical lockers of fixed sizes: a tiny key drawer (byte), a locker (int), and an oversized freight vault (long). In Java, primitives store values directly in those lockers—no keys or pointers needed.',
    contentSimple: `### What are Primitive Types?

In Java, all data belongs to one of two categories: **primitive types** or **reference types**.

Java has exactly **8 primitive types**, built directly into the language:
1. \`byte\`: 8-bit signed integer (-128 to 127)
2. \`short\`: 16-bit signed integer (-32,768 to 32,767)
3. \`int\`: 32-bit signed integer (~ -2.14 billion to +2.14 billion). The default for numbers.
4. \`long\`: 64-bit signed integer (use trailing \`L\`, e.g., \`3000000000L\`).
5. \`float\`: 32-bit IEEE 754 floating point (use trailing \`f\`, e.g., \`3.14f\`).
6. \`double\`: 64-bit IEEE 754 floating point. The default for decimals.
7. \`boolean\`: true or false.
8. \`char\`: 16-bit unsigned Unicode character ('A', '\\u0041').

Primitives hold their raw binary values directly on the stack or inline inside object fields. They cannot be \`null\`.`,
    contentStandard: `### Type Conversion, Overflow & Precision

#### Widening vs Narrowing Conversions
- **Widening (Automatic)**: Converting a smaller type to a larger type (e.g. \`int\` -> \`long\`, \`float\` -> \`double\`) occurs automatically with zero precision loss for integers:
  \`\`\`java
  int small = 42;
  long big = small; // Automatic widening
  \`\`\`
- **Narrowing (Explicit Cast)**: Converting a larger type to a smaller type requires an explicit cast and truncates higher-order bits:
  \`\`\`java
  long big = 130L;
  byte small = (byte) big; // Explicit cast: wraps around to -126!
  \`\`\`

#### Integer Overflow
Java integer arithmetic wraps around quietly using two's complement arithmetic:
\`\`\`java
int max = Integer.MAX_VALUE; // 2,147,483,647
int overflowed = max + 1;    // -2,147,483,648 (Wraps to Integer.MIN_VALUE!)
\`\`\`
Use \`Math.addExact(a, b)\` if you want Java to throw an \`ArithmeticException\` on overflow instead of wrapping silently.`,
    contentDeep: `### JVM Stack Frame Internals & IEEE 754 Nuances

#### JVM Operand Stack Representation
At the JVM bytecode level (JVM Specification §2.6), the local variable table and operand stack treat values in **words**:
- Types \`boolean\`, \`byte\`, \`char\`, and \`short\` are evaluated as 32-bit integers (\`int\`) by bytecode instructions such as \`iload\`, \`iadd\`, and \`istore\`.
- Only when stored into byte arrays or class fields are they truncated to their native bit sizes.
- \`long\` and \`double\` occupy two consecutive entries (64 bits) in the local variable array.

#### IEEE 754 Floating-Point Hazards
Floating-point numbers (\`float\`, \`double\`) represent base-2 fractions and cannot represent base-10 fractions like 0.1 exactly:
\`\`\`java
double sum = 0.1 + 0.2;
System.out.println(sum == 0.3); // prints false! (0.30000000000000004)
\`\`\`
For financial calculations, never use \`double\` or \`float\`. Use \`java.math.BigDecimal\` or store currency as integer cents in a \`long\`.`,
    visualization: {
      kind: 'array',
      title: 'Primitive Sizes in Bytes',
      summary: 'Visualizing memory footprints of byte, short, int, and long',
      initial: {
        array: [1, 2, 4, 8],
        highlights: [0],
        pointers: { current: 0 },
        labels: { 0: 'byte (1B)', 1: 'short (2B)', 2: 'int (4B)', 3: 'long (8B)' },
      },
      steps: [
        {
          line: 1,
          text: 'byte occupies 1 byte (8 bits): -128 to 127',
          state: {
            array: [1, 2, 4, 8],
            highlights: [0],
            pointers: { current: 0 },
            labels: { 0: 'byte (1B)', 1: 'short (2B)', 2: 'int (4B)', 3: 'long (8B)' },
          },
        },
        {
          line: 2,
          text: 'short occupies 2 bytes (16 bits): -32,768 to 32,767',
          state: {
            array: [1, 2, 4, 8],
            highlights: [1],
            pointers: { current: 1 },
            labels: { 0: 'byte (1B)', 1: 'short (2B)', 2: 'int (4B)', 3: 'long (8B)' },
          },
        },
        {
          line: 3,
          text: 'int occupies 4 bytes (32 bits): standard integer up to 2.14B',
          state: {
            array: [1, 2, 4, 8],
            highlights: [2],
            pointers: { current: 2 },
            labels: { 0: 'byte (1B)', 1: 'short (2B)', 2: 'int (4B)', 3: 'long (8B)' },
          },
        },
        {
          line: 4,
          text: 'long occupies 8 bytes (64 bits): astronomical ranges requiring L suffix',
          state: {
            array: [1, 2, 4, 8],
            highlights: [3],
            pointers: { current: 3 },
            labels: { 0: 'byte (1B)', 1: 'short (2B)', 2: 'int (4B)', 3: 'long (8B)' },
          },
        },
      ],
    },
    codeStarter: `public class PrimitiveDemo {
    public static void main(String[] args) {
        int count = 100;
        long population = 8_000_000_000L;
        double price = 19.99;
        boolean isActive = true;

        System.out.println("Count: " + count);
        System.out.println("Population: " + population);
        System.out.println("Price: $" + price);
        System.out.println("Active: " + isActive);
    }
}`,
    codeSolution: `public class PrimitiveDemo {
    public static void main(String[] args) {
        int count = 100;
        long population = 8_000_000_000L;
        double price = 19.99;
        boolean isActive = true;

        System.out.println("Count: " + count);
        System.out.println("Population: " + population);
        System.out.println("Price: $" + price);
        System.out.println("Active: " + isActive);
    }
}`,
    commonMistakes: [
      {
        mistake: 'Silent Integer Overflow in Multiplication',
        explanation:
          'Multiplying two large integers overflows before being assigned to a long variable.',
        badCode: 'long micros = 24 * 60 * 60 * 1000 * 1000; // Overflows 32-bit int first!',
        goodCode: 'long micros = 24L * 60 * 60 * 1000 * 1000; // 24L forces 64-bit arithmetic',
      },
      {
        mistake: 'Using == to Compare Floating Point Numbers',
        explanation: 'Rounding errors in IEEE 754 numbers mean 0.1 + 0.2 does not equal 0.3.',
        badCode: 'if (0.1 + 0.2 == 0.3) { ... } // Evaluates to false',
        goodCode: 'if (Math.abs((0.1 + 0.2) - 0.3) < 1e-9) { ... } // Epsilon comparison',
      },
    ],
    quiz: [
      {
        id: 'pt-q1',
        question: 'Which of the following is a primitive type in Java?',
        options: ['String', 'Integer', 'boolean', 'BigDecimal'],
        answerIndex: 2,
        explanation:
          'boolean is one of the 8 Java primitives. String, Integer, and BigDecimal are reference types.',
      },
      {
        id: 'pt-q2',
        question: 'What is the default value of an uninitialized int instance variable?',
        options: ['null', '0', '-1', 'Undefined'],
        answerIndex: 1,
        explanation: 'Primitive numeric instance variables default to 0 in Java.',
      },
      {
        id: 'pt-q3',
        question: 'What happens when (byte) 127 + 1 is cast back to byte in Java?',
        options: ['128', '-128', 'Throws ArithmeticException', 'Compilation error'],
        answerIndex: 1,
        explanation: 'byte is signed 8-bit (-128 to 127). 127 + 1 overflows to -128.',
      },
      {
        id: 'pt-q4',
        question: 'Why should float/double not be used for currency calculations?',
        options: [
          'They cannot represent numbers larger than 1,000,000',
          'Binary floating point cannot accurately represent base-10 fractional decimals like 0.10',
          'They are not supported in Java 21',
          'They are slower than BigDecimal',
        ],
        answerIndex: 1,
        explanation:
          'Binary floating-point arithmetic introduces fractional rounding errors, making it unsuitable for exact currency math.',
      },
      {
        id: 'pt-q5',
        question: 'How many bytes of memory does a char occupy in Java?',
        options: ['1 byte', '2 bytes', '4 bytes', 'Variable (1 to 4 bytes)'],
        answerIndex: 1,
        explanation: 'char in Java is always 2 bytes (16 bits), representing a UTF-16 code unit.',
      },
    ],
    challenge: {
      prompt:
        'Implement a static method `public static boolean isSafeAdd(int a, int b)` that returns true if adding a and b will NOT overflow 32-bit integer limits, and false if it will overflow.',
      starterCode: `class Solution {
    public static boolean isSafeAdd(int a, int b) {
        // Write your solution here
        return true;
    }
}`,
      solutionCode: `class Solution {
    public static boolean isSafeAdd(int a, int b) {
        long sum = (long) a + (long) b;
        return sum >= Integer.MIN_VALUE && sum <= Integer.MAX_VALUE;
    }
}`,
      testCode: `public class TestHarness {
    public static void main(String[] args) {
        if (!Solution.isSafeAdd(100, 200)) throw new AssertionError("Failed safe addition");
        if (Solution.isSafeAdd(Integer.MAX_VALUE, 1)) throw new AssertionError("Failed positive overflow detection");
        if (Solution.isSafeAdd(Integer.MIN_VALUE, -1)) throw new AssertionError("Failed negative overflow detection");
        if (!Solution.isSafeAdd(Integer.MAX_VALUE - 10, 10)) throw new AssertionError("Failed boundary addition");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'Cast operands to 64-bit long before performing the addition.',
        'Compare the 64-bit sum with Integer.MAX_VALUE and Integer.MIN_VALUE.',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 2. FOUNDATIONS: control-flow
  // ===========================================================================
  {
    slug: 'control-flow',
    title: 'Modern Java Control Flow & Pattern Matching',
    track: 'foundations',
    module: 'Logic & Branching',
    orderIndex: 2,
    published: true,
    difficulty: 'EASY',
    estimatedMinutes: 20,
    hook: 'Traffic signals and railroad switches route thousands of vehicles safely every minute. Control flow structures in Java are the switches that direct your program execution along exact conditional tracks.',
    contentSimple: `### Directing Program Execution

Without control flow, computer programs would execute line by line from top to bottom and stop. Java provides three fundamental control flow categories:

1. **Selection (Branching)**: \`if\`, \`else if\`, \`else\`, and \`switch\`.
2. **Iteration (Loops)**: \`for\`, \`while\`, \`do-while\`, and enhanced-for (\`for-each\`).
3. **Jump Statements**: \`break\`, \`continue\`, and \`return\`.

\`\`\`java
int score = 85;
if (score >= 90) {
    System.out.println("Grade A");
} else if (score >= 80) {
    System.out.println("Grade B"); // Prints Grade B
} else {
    System.out.println("Keep practicing!");
}
\`\`\``,
    contentStandard: `### Modern Switch Expressions (Java 14+) & Pattern Matching

Classical Java switch statements required verbose \`break\` statements to prevent accidental fall-through. Modern Java introduces **Switch Expressions**:

\`\`\`java
DayOfWeek day = DayOfWeek.FRIDAY;
String activity = switch (day) {
    case MONDAY, TUESDAY, WEDNESDAY, THURSDAY -> "Work";
    case FRIDAY -> "Review code & deploy";
    case SATURDAY, SUNDAY -> "Rest & learn";
};
\`\`\`

Key advantages of Switch Expressions:
- **No fall-through**: Each arrow (\`->\`) branch executes only its own expression or block.
- **Yielding values**: For multi-line branches, the \`yield\` keyword returns a value.
- **Exhaustiveness checking**: The compiler guarantees every possible enum or sealed type case is handled.

#### Enhanced For-Loop
When iterating over arrays or collections without needing the index:
\`\`\`java
String[] names = {"Alice", "Bob", "Charlie"};
for (String name : names) {
    System.out.println(name);
}
\`\`\``,
    contentDeep: `### Bytecode Compilation & Branch Prediction

#### tableswitch vs lookupswitch
When the Java compiler translates a switch statement into bytecode, it chooses between two instructions:
1. \`tableswitch\`: Used when case values are dense (contiguous integers). It creates an O(1) jump table in bytecode indexed directly by integer value.
2. \`lookupswitch\`: Used when case values are sparse. It uses an ordered list of key-target pairs and performs a binary search at runtime (O(log N)).

#### Branch Prediction & The CPU Pipeline
Modern CPU architectures execute instructions through a speculative execution pipeline.
- If a condition (e.g. \`if (sortedArray[i] > 128)\`) is predictable, the CPU branch predictor guesses correctly, avoiding pipeline stalls.
- If branches are random, branch mispredictions flush the pipeline, causing 10-20 cycle penalties. Writing branch-friendly code (or branchless algorithms) is crucial in low-latency systems.`,
    visualization: {
      kind: 'array',
      title: 'Loop Branch Execution Trace',
      summary: 'Stepping through a loop filtering numbers greater than 10',
      initial: {
        array: [5, 12, 8, 20],
        highlights: [0],
        pointers: { i: 0 },
        labels: { 0: '5', 1: '12', 2: '8', 3: '20' },
      },
      steps: [
        {
          line: 2,
          text: 'Checking index 0: 5 > 10 is false, skip',
          state: {
            array: [5, 12, 8, 20],
            highlights: [],
            pointers: { i: 0 },
            labels: { 0: 'skip', 1: '12', 2: '8', 3: '20' },
          },
        },
        {
          line: 2,
          text: 'Checking index 1: 12 > 10 is true, select!',
          state: {
            array: [5, 12, 8, 20],
            highlights: [1],
            pointers: { i: 1 },
            labels: { 0: 'skip', 1: 'MATCH (12)', 2: '8', 3: '20' },
          },
        },
        {
          line: 2,
          text: 'Checking index 2: 8 > 10 is false, skip',
          state: {
            array: [5, 12, 8, 20],
            highlights: [1],
            pointers: { i: 2 },
            labels: { 0: 'skip', 1: 'MATCH (12)', 2: 'skip', 3: '20' },
          },
        },
        {
          line: 2,
          text: 'Checking index 3: 20 > 10 is true, select!',
          state: {
            array: [5, 12, 8, 20],
            highlights: [1, 3],
            pointers: { i: 3 },
            labels: { 0: 'skip', 1: 'MATCH (12)', 2: 'skip', 3: 'MATCH (20)' },
          },
        },
      ],
    },
    codeStarter: `public class ControlFlowDemo {
    public static void main(String[] args) {
        int day = 3;
        String dayName = switch (day) {
            case 1 -> "Monday";
            case 2 -> "Tuesday";
            case 3 -> "Wednesday";
            default -> "Other day";
        };

        System.out.println("Day 3 is: " + dayName);
    }
}`,
    codeSolution: `public class ControlFlowDemo {
    public static void main(String[] args) {
        int day = 3;
        String dayName = switch (day) {
            case 1 -> "Monday";
            case 2 -> "Tuesday";
            case 3 -> "Wednesday";
            default -> "Other day";
        };

        System.out.println("Day 3 is: " + dayName);
    }
}`,
    commonMistakes: [
      {
        mistake: 'Modifying a Collection During Enhanced For-Loop',
        explanation:
          'Removing an item from a list during enhanced-for throws ConcurrentModificationException.',
        badCode: 'for (String s : list) { if (s.isEmpty()) list.remove(s); } // Throws Exception!',
        goodCode: 'list.removeIf(String::isEmpty); // Clean, safe removal',
      },
      {
        mistake: 'Accidental Fall-Through in Traditional Switch',
        explanation: 'Omitting break causes subsequent cases to execute unintended code.',
        badCode: 'case 1: doThing(); // missing break!\ncase 2: doOther();',
        goodCode:
          'case 1 -> doThing();\ncase 2 -> doOther(); // Switch expression prevents fall-through',
      },
    ],
    quiz: [
      {
        id: 'cf-q1',
        question:
          'Which switch syntax prevents accidental fall-through without needing break statements?',
        options: ['case 1: break;', 'case 1 -> ...', 'case (1) => ...', 'switch.case(1)'],
        answerIndex: 1,
        explanation:
          'Modern Java switch expressions using the arrow syntax (->) never fall through to subsequent cases.',
      },
      {
        id: 'cf-q2',
        question:
          'What keyword is used to return a value from a multi-line switch expression branch?',
        options: ['return', 'yield', 'emit', 'break'],
        answerIndex: 1,
        explanation:
          'In Java 14+, the yield keyword returns a value from a code block within a switch expression.',
      },
      {
        id: 'cf-q3',
        question: 'What happens when modifying a list directly inside an enhanced-for loop?',
        options: [
          'The list updates normally',
          'The loop skips the next element',
          'Throws ConcurrentModificationException',
          'The loop terminates cleanly',
        ],
        answerIndex: 2,
        explanation:
          'Enhanced-for uses an internal Iterator. Modifying the underlying collection directly causes ConcurrentModificationException.',
      },
      {
        id: 'cf-q4',
        question: 'Which loop is guaranteed to execute its body at least once?',
        options: ['for loop', 'while loop', 'do-while loop', 'enhanced-for loop'],
        answerIndex: 2,
        explanation:
          'A do-while loop evaluates its conditional test at the end of the iteration, guaranteeing at least one execution.',
      },
      {
        id: 'cf-q5',
        question: 'What bytecode instruction is generated for dense, contiguous switch statements?',
        options: ['tableswitch', 'lookupswitch', 'if_icmpeq', 'invokedynamic'],
        answerIndex: 0,
        explanation:
          'The JVM compiler produces a tableswitch instruction when integer cases are clustered contiguously, offering O(1) indexed branching.',
      },
    ],
    challenge: {
      prompt:
        'Implement `public static String categorizeAge(int age)` returning: "child" (0-12), "teen" (13-19), "adult" (20-64), "senior" (65+), or "invalid" for negative ages.',
      starterCode: `class Solution {
    public static String categorizeAge(int age) {
        // Write your solution here
        return "";
    }
}`,
      solutionCode: `class Solution {
    public static String categorizeAge(int age) {
        if (age < 0) return "invalid";
        if (age <= 12) return "child";
        if (age <= 19) return "teen";
        if (age <= 64) return "adult";
        return "senior";
    }
}`,
      testCode: `public class TestHarness {
    public static void main(String[] args) {
        if (!"invalid".equals(Solution.categorizeAge(-5))) throw new AssertionError("Failed negative age");
        if (!"child".equals(Solution.categorizeAge(0))) throw new AssertionError("Failed age 0");
        if (!"child".equals(Solution.categorizeAge(12))) throw new AssertionError("Failed age 12");
        if (!"teen".equals(Solution.categorizeAge(13))) throw new AssertionError("Failed age 13");
        if (!"adult".equals(Solution.categorizeAge(25))) throw new AssertionError("Failed age 25");
        if (!"senior".equals(Solution.categorizeAge(65))) throw new AssertionError("Failed age 65");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'Check for negative values first to handle edge cases cleanly.',
        'Use ordered if-else branches or modern range evaluations.',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 3. FOUNDATIONS: methods-exceptions
  // ===========================================================================
  {
    slug: 'methods-exceptions',
    title: 'Call Stack, Methods & Exception Resilience',
    track: 'foundations',
    module: 'Methods & Robustness',
    orderIndex: 3,
    published: true,
    difficulty: 'MEDIUM',
    estimatedMinutes: 20,
    hook: 'Like a physical stack of cafeteria trays, each method call places a new tray on top of the pile. When methods finish, trays are removed. But what happens when an unexpected fire alarm rings? That is an exception.',
    contentSimple: `### Methods and How They Run

A **method** is a reusable block of code that performs an action. It has a signature, parameters, and a return type:
\`\`\`java
public static int add(int a, int b) {
    return a + b;
}
\`\`\`

When methods execute, the JVM manages them on the **Call Stack**:
1. Calling a method pushes a new **stack frame** containing local variables and intermediate calculations.
2. Returning from a method pops that frame, returning control to the caller.

### Exceptions
An **exception** is an event that disrupts normal execution flow. You handle them with \`try-catch-finally\`:
\`\`\`java
try {
    int result = 10 / 0; // Throws ArithmeticException
} catch (ArithmeticException e) {
    System.out.println("Cannot divide by zero!");
} finally {
    System.out.println("This cleanup always runs.");
}
\`\`\``,
    contentStandard: `### Checked vs Unchecked Exceptions & Try-With-Resources

#### Exception Hierarchy
All errors inherit from \`java.lang.Throwable\`:
- \`Error\`: Severe JVM system failures (e.g. \`OutOfMemoryError\`, \`StackOverflowError\`). Do not attempt to catch these.
- \`Exception\`: Conditions programs should anticipate:
  - **Checked Exceptions**: Subclasses of \`Exception\` (except \`RuntimeException\`). The compiler forces you to either catch them or declare them in your method signature with \`throws\` (e.g. \`IOException\`, \`SQLException\`).
  - **Unchecked Exceptions**: Subclasses of \`RuntimeException\` (e.g. \`NullPointerException\`, \`IllegalArgumentException\`). Indicate programming bugs.

#### Try-with-Resources (AutoCloseable)
Any resource that implements \`java.lang.AutoCloseable\` can be automatically closed, eliminating boilerplate \`finally\` blocks and preventing resource leaks:
\`\`\`java
try (BufferedReader reader = new BufferedReader(new FileReader("data.txt"))) {
    String line = reader.readLine();
} // reader is closed automatically even if readLine() throws!
\`\`\``,
    contentDeep: `### JVM Stack Unwinding & Pass-By-Value Mechanics

#### Java is Strictly Pass-By-Value
A common misconception is that Java passes objects by reference. In fact:
- **Java is strictly pass-by-value, always.**
- For primitive types, the actual binary value is copied into the method frame.
- For object references, **the reference (pointer address) is copied by value**.
  \`\`\`java
  void modify(Dog d) {
      d.setName("Fido"); // Mutates the object both pointers reference
      d = new Dog("Spot"); // Reassigning local copy has zero effect on the caller's pointer!
  }
  \`\`\`

#### Stack Unwinding & Performance Costs
When an exception is thrown, the JVM traverses up the active stack frames until it finds a matching \`catch\` handler.
- Constructing a \`Throwable\` calls the native method \`fillInStackTrace()\`, which walks the entire OS thread stack and captures file names and line numbers.
- In high-throughput systems, never use exceptions for regular control flow (e.g. validating user inputs). Prefer result objects or \`Optional\`.`,
    visualization: {
      kind: 'stack',
      title: 'JVM Call Stack Push & Pop',
      summary:
        'Demonstrating stack frames pushing during nested method calls and popping on return',
      initial: {
        stack: ['main()'],
        highlights: [0],
        pointers: { top: 0 },
      },
      steps: [
        {
          line: 1,
          text: 'Application starts: main() frame pushed to call stack',
          state: {
            stack: ['main()'],
            highlights: [0],
            pointers: { top: 0 },
          },
        },
        {
          line: 2,
          text: 'main() calls calculateTotal(): calculateTotal() frame pushed',
          state: {
            stack: ['main()', 'calculateTotal()'],
            highlights: [1],
            pointers: { top: 1 },
          },
        },
        {
          line: 3,
          text: 'calculateTotal() calls applyTax(): applyTax() frame pushed on top',
          state: {
            stack: ['main()', 'calculateTotal()', 'applyTax()'],
            highlights: [2],
            pointers: { top: 2 },
          },
        },
        {
          line: 4,
          text: 'applyTax() completes and returns tax rate: frame popped',
          state: {
            stack: ['main()', 'calculateTotal()'],
            highlights: [1],
            pointers: { top: 1 },
          },
        },
        {
          line: 5,
          text: 'calculateTotal() finishes calculation and returns: frame popped',
          state: {
            stack: ['main()'],
            highlights: [0],
            pointers: { top: 0 },
          },
        },
      ],
    },
    codeStarter: `public class ExceptionDemo {
    public static int parsePositiveInt(String input) {
        if (input == null || input.isBlank()) {
            throw new IllegalArgumentException("Input cannot be empty");
        }
        int val = Integer.parseInt(input);
        if (val < 0) {
            throw new IllegalArgumentException("Number must be positive: " + val);
        }
        return val;
    }

    public static void main(String[] args) {
        try {
            int result = parsePositiveInt("-42");
            System.out.println("Parsed: " + result);
        } catch (IllegalArgumentException e) {
            System.err.println("Validation failed: " + e.getMessage());
        }
    }
}`,
    codeSolution: `public class ExceptionDemo {
    public static int parsePositiveInt(String input) {
        if (input == null || input.isBlank()) {
            throw new IllegalArgumentException("Input cannot be empty");
        }
        int val = Integer.parseInt(input);
        if (val < 0) {
            throw new IllegalArgumentException("Number must be positive: " + val);
        }
        return val;
    }

    public static void main(String[] args) {
        try {
            int result = parsePositiveInt("-42");
            System.out.println("Parsed: " + result);
        } catch (IllegalArgumentException e) {
            System.err.println("Validation failed: " + e.getMessage());
        }
    }
}`,
    commonMistakes: [
      {
        mistake: 'Returning from Inside a Finally Block',
        explanation:
          'Returning from finally silently swallows and suppresses any thrown exceptions.',
        badCode: 'try { throw new RuntimeException(); } finally { return 42; } // Exception lost!',
        goodCode: 'try { return compute(); } finally { cleanUp(); } // Clean separation',
      },
      {
        mistake: 'Catching Generic Throwable or Error',
        explanation:
          'Catching Throwable catches JVM fatal errors like OutOfMemoryError, preventing clean shutdown.',
        badCode: 'catch (Throwable t) { ... } // Never do this',
        goodCode: 'catch (Exception e) { ... } // Catch checked/runtime exceptions only',
      },
    ],
    quiz: [
      {
        id: 'me-q1',
        question: 'Is Java pass-by-reference or pass-by-value for object parameters?',
        options: [
          'Pass-by-reference for objects, pass-by-value for primitives',
          'Strictly pass-by-value for everything (references are copied by value)',
          'Pass-by-reference if the object is mutable',
          'Determined at runtime by JVM optimization',
        ],
        answerIndex: 1,
        explanation:
          'Java is strictly pass-by-value. When passing an object, the memory reference is copied by value.',
      },
      {
        id: 'me-q2',
        question:
          'Which interface must a class implement to be used in a try-with-resources statement?',
        options: [
          'java.io.Closeable only',
          'java.lang.AutoCloseable',
          'java.lang.Runnable',
          'java.util.Disposable',
        ],
        answerIndex: 1,
        explanation:
          'Any class implementing java.lang.AutoCloseable can be managed by try-with-resources.',
      },
      {
        id: 'me-q3',
        question: 'Which of the following is a checked exception in Java?',
        options: [
          'NullPointerException',
          'IllegalArgumentException',
          'IOException',
          'IndexOutOfBoundsException',
        ],
        answerIndex: 2,
        explanation:
          'IOException extends Exception directly and is a checked exception requiring explicit handling.',
      },
      {
        id: 'me-q4',
        question: 'What happens if code in both the try block and finally block return a value?',
        options: [
          'The try block return value is returned',
          'The finally block return value overrides the try return value',
          'Compilation error',
          'Undefined runtime behavior',
        ],
        answerIndex: 1,
        explanation:
          'The finally block executes last and its return statement overrides any prior return statement.',
      },
      {
        id: 'me-q5',
        question: 'What is the performance overhead when creating a new Throwable instance?',
        options: [
          'Zero overhead',
          'fillInStackTrace() walks the OS thread stack frames to record locations',
          'Heap garbage collection pause',
          'JIT compiler deoptimization',
        ],
        answerIndex: 1,
        explanation:
          'Capturing the complete stack trace via native fillInStackTrace() requires walking active frames, which carries measurable latency.',
      },
    ],
    challenge: {
      prompt:
        'Implement `public static double safeDivide(int numerator, int denominator)` that returns the division result, or throws an `IllegalArgumentException` with message "Division by zero" if denominator is 0.',
      starterCode: `class Solution {
    public static double safeDivide(int numerator, int denominator) {
        // Write your solution here
        return 0.0;
    }
}`,
      solutionCode: `class Solution {
    public static double safeDivide(int numerator, int denominator) {
        if (denominator == 0) {
            throw new IllegalArgumentException("Division by zero");
        }
        return (double) numerator / denominator;
    }
}`,
      testCode: `public class TestHarness {
    public static void main(String[] args) {
        if (Math.abs(Solution.safeDivide(10, 2) - 5.0) > 1e-6) throw new AssertionError("Failed simple division");
        if (Math.abs(Solution.safeDivide(7, 2) - 3.5) > 1e-6) throw new AssertionError("Failed fractional division");
        boolean caught = false;
        try {
            Solution.safeDivide(5, 0);
        } catch (IllegalArgumentException e) {
            if ("Division by zero".equals(e.getMessage())) caught = true;
        }
        if (!caught) throw new AssertionError("Failed to throw IllegalArgumentException on zero");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'Check if denominator == 0 before performing any division.',
        'Cast numerator to double before dividing to prevent integer truncation.',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 4. OOP: classes-objects
  // ===========================================================================
  {
    slug: 'classes-objects',
    title: 'Classes, Encapsulation & The this Reference',
    track: 'oop',
    module: 'Object Fundamentals',
    orderIndex: 4,
    published: true,
    difficulty: 'EASY',
    estimatedMinutes: 20,
    hook: 'An architectural blueprint is not a building you can live in; it is instructions for creating houses. A Class is the blueprint; Objects are the actual houses created on the JVM Heap.',
    contentSimple: `### The Essence of Object-Oriented Programming

Java is an object-oriented language organized around classes and objects:
- **Class**: A template or blueprint defining properties (fields) and capabilities (methods).
- **Object (Instance)**: A concrete realization created on the heap with the \`new\` keyword.

\`\`\`java
public class User {
    private String username; // Encapsulated field

    public User(String username) {
        this.username = username; // 'this' disambiguates the field from the parameter
    }

    public String getUsername() {
        return this.username;
    }
}
\`\`\`

#### Encapsulation
Encapsulation means protecting internal object state by declaring fields \`private\` and controlling access through public methods (getters and setters), ensuring class invariants are never violated.`,
    contentStandard: `### Constructors, Invariants & The \`this\` Keyword

#### The \`this\` Keyword
\`this\` is an implicit reference to the current object instance:
1. **Disambiguate parameters**: \`this.balance = balance;\`
2. **Constructor chaining**: \`this("Guest", 0);\`, invoking an overloaded constructor from another constructor (must be the first statement).
3. **Passing the instance**: Passing \`this\` to external listeners or callbacks.

#### Enforcing Business Invariants
Never write setters that blindly accept any input. Validate state transitions:
\`\`\`java
public class BankAccount {
    private long balanceCents;

    public void deposit(long amountCents) {
        if (amountCents <= 0) {
            throw new IllegalArgumentException("Deposit must be positive");
        }
        this.balanceCents += amountCents;
    }
}
\`\`\``,
    contentDeep: `### HotSpot Object Layout & Compressed OOPs

#### Memory Layout of a Java Object on HotSpot 64-bit JVM
Every object created on the heap has a standard header:
1. **Mark Word (64 bits / 8 bytes)**: Identity hashcode, biased locking flags, GC age bits, and lock state pointers.
2. **Klass Word (64 bits or 32 bits with Compressed OOPs)**: Pointer to the metadata representation of the class in Metaspace.
3. **Instance Data**: The actual primitive fields and object reference pointers.
4. **Padding**: HotSpot aligns all objects on 8-byte boundaries. If the payload is not a multiple of 8 bytes, padding bytes are appended.

#### Compressed OOPs (Ordinary Object Pointers)
On 64-bit systems with heap sizes under 32 GB, HotSpot enables \`-XX:+UseCompressedOops\`, shifting 32-bit pointers by 3 bits to address 32 GB of heap while consuming only 4 bytes per pointer instead of 8 bytes, reducing memory footprint by up to 40%.`,
    visualization: {
      kind: 'jvm_memory',
      title: 'Heap Allocation and Stack References',
      summary: 'Observing Stack reference variable pointing to an Object allocated in Heap memory',
      initial: {
        stack: [{ name: 'account', value: '0x4F12', type: 'BankAccount' }],
        heap: [{ id: '0x4F12', className: 'BankAccount', fields: { balance: 100 } }],
        metaspace: [{ className: 'BankAccount', methods: ['deposit', 'withdraw'] }],
      },
      steps: [
        {
          line: 1,
          text: 'BankAccount account declared: stack allocates reference variable',
          state: {
            stack: [{ name: 'account', value: 'null', type: 'BankAccount' }],
            heap: [],
            metaspace: [{ className: 'BankAccount', methods: ['deposit', 'withdraw'] }],
          },
        },
        {
          line: 2,
          text: 'new BankAccount(100): object allocated in Heap at 0x4F12, balance initialized to 100',
          state: {
            stack: [{ name: 'account', value: '0x4F12', type: 'BankAccount' }],
            heap: [{ id: '0x4F12', className: 'BankAccount', fields: { balance: 100 } }],
            metaspace: [{ className: 'BankAccount', methods: ['deposit', 'withdraw'] }],
          },
        },
        {
          line: 3,
          text: 'account.deposit(50): method updates balance in heap object to 150',
          state: {
            stack: [{ name: 'account', value: '0x4F12', type: 'BankAccount' }],
            heap: [{ id: '0x4F12', className: 'BankAccount', fields: { balance: 150 } }],
            metaspace: [{ className: 'BankAccount', methods: ['deposit', 'withdraw'] }],
          },
        },
      ],
    },
    codeStarter: `public class BankAccount {
    private String owner;
    private int balance;

    public BankAccount(String owner, int initialBalance) {
        if (initialBalance < 0) {
            throw new IllegalArgumentException("Initial balance cannot be negative");
        }
        this.owner = owner;
        this.balance = initialBalance;
    }

    public void deposit(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Amount must be positive");
        this.balance += amount;
    }

    public int getBalance() {
        return this.balance;
    }

    public static void main(String[] args) {
        BankAccount acct = new BankAccount("Alice", 250);
        acct.deposit(50);
        System.out.println("Final Balance: " + acct.getBalance());
    }
}`,
    codeSolution: `public class BankAccount {
    private String owner;
    private int balance;

    public BankAccount(String owner, int initialBalance) {
        if (initialBalance < 0) {
            throw new IllegalArgumentException("Initial balance cannot be negative");
        }
        this.owner = owner;
        this.balance = initialBalance;
    }

    public void deposit(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Amount must be positive");
        this.balance += amount;
    }

    public int getBalance() {
        return this.balance;
    }

    public static void main(String[] args) {
        BankAccount acct = new BankAccount("Alice", 250);
        acct.deposit(50);
        System.out.println("Final Balance: " + acct.getBalance());
    }
}`,
    commonMistakes: [
      {
        mistake: 'Shadowing Class Fields Without this',
        explanation: 'Assigning a parameter to itself instead of assigning to the instance field.',
        badCode: 'public void setBalance(int balance) { balance = balance; } // No effect!',
        goodCode: 'public void setBalance(int balance) { this.balance = balance; }',
      },
      {
        mistake: 'Exposing Mutable References from Getters',
        explanation:
          'Returning a mutable array or date reference allows outside callers to mutate private state.',
        badCode: 'public Date getCreated() { return this.created; } // Caller can call .setTime()',
        goodCode:
          'public Date getCreated() { return new Date(this.created.getTime()); } // Defensive copy',
      },
    ],
    quiz: [
      {
        id: 'co-q1',
        question: 'Where are Java object instances physically allocated at runtime?',
        options: ['Call Stack', 'Heap Memory', 'Metaspace', 'CPU Register Cache'],
        answerIndex: 1,
        explanation:
          'All object instances in Java are allocated on the Heap. The Call Stack only stores reference pointers to those heap objects.',
      },
      {
        id: 'co-q2',
        question: 'What is the primary objective of Encapsulation in OOP?',
        options: [
          'To make all code execute faster',
          'To hide and protect internal state invariants from arbitrary external modification',
          'To allow multiple classes to have the same name',
          'To prevent garbage collection',
        ],
        answerIndex: 1,
        explanation:
          'Encapsulation restricts direct access to internal state, ensuring modifications pass through validating methods.',
      },
      {
        id: 'co-q3',
        question:
          'Where must constructor chaining calls like this(...) be placed inside a constructor?',
        options: [
          'Anywhere in the constructor',
          'As the very first statement',
          'As the final statement',
          'Inside a static block',
        ],
        answerIndex: 1,
        explanation:
          'Java requires this(...) or super(...) constructor chaining calls to be the very first statement in a constructor.',
      },
      {
        id: 'co-q4',
        question:
          'What optimization does HotSpot use to compress 64-bit object pointers into 32 bits on heaps under 32 GB?',
        options: ['Compressed OOPs', 'Pointers stripping', 'Virtual Threads', 'Tiered Compilation'],
        answerIndex: 0,
        explanation:
          'Compressed OOPs (-XX:+UseCompressedOops) shifts pointers by 3 bits to address 32 GB with 32-bit representations.',
      },
      {
        id: 'co-q5',
        question: 'What two 64-bit words make up the standard object header in 64-bit HotSpot JVM?',
        options: [
          'Mark Word and Klass Word',
          'Stack Word and Pointer Word',
          'Hash Word and Size Word',
          'Vtable Word and Itable Word',
        ],
        answerIndex: 0,
        explanation:
          'The standard HotSpot object header consists of the Mark Word (locking, identity hash, GC flags) and the Klass Word (class metadata pointer).',
      },
    ],
    challenge: {
      prompt:
        'Create a class `Counter` with a private `count` integer. Provide a constructor `Counter(int initial)`, a method `void increment()`, and `int getCount()`. Throw `IllegalArgumentException` if `initial` is negative.',
      starterCode: `class Counter {
    // Write your fields, constructor, and methods here
}`,
      solutionCode: `class Counter {
    private int count;

    public Counter(int initial) {
        if (initial < 0) throw new IllegalArgumentException("Initial cannot be negative");
        this.count = initial;
    }

    public void increment() {
        this.count++;
    }

    public int getCount() {
        return this.count;
    }
}`,
      testCode: `public class TestHarness {
    public static void main(String[] args) {
        Counter c = new Counter(5);
        if (c.getCount() != 5) throw new AssertionError("Failed initial count");
        c.increment();
        if (c.getCount() != 6) throw new AssertionError("Failed increment");
        boolean caught = false;
        try {
            new Counter(-1);
        } catch (IllegalArgumentException e) {
            caught = true;
        }
        if (!caught) throw new AssertionError("Failed negative validation");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: ['Declare count as private int.', 'Validate initial >= 0 in the constructor.'],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 5. OOP: inheritance-polymorphism
  // ===========================================================================
  {
    slug: 'inheritance-polymorphism',
    title: 'Class Hierarchies & Dynamic Method Dispatch',
    track: 'oop',
    module: 'Object Fundamentals',
    orderIndex: 5,
    published: true,
    difficulty: 'MEDIUM',
    estimatedMinutes: 25,
    hook: 'When an artist asks an orchestra to "Play!", the violinist plays the violin, the flutist blows the flute, and the drummer beats the drum. One unified command, multiple distinct behaviors: that is Polymorphism.',
    contentSimple: `### What is Inheritance and Polymorphism?

- **Inheritance**: A child class inherits state and methods from a parent class using the \`extends\` keyword, enabling code reuse.
- **Polymorphism**: The ability of different classes to respond to the same method call in their own specific way.

\`\`\`java
public class Animal {
    public void speak() {
        System.out.println("Animal sound");
    }
}

public class Dog extends Animal {
    @Override
    public void speak() {
        System.out.println("Woof!"); // Overridden behavior
    }
}
\`\`\`

When you assign a \`Dog\` to an \`Animal\` variable:
\`\`\`java
Animal myPet = new Dog();
myPet.speak(); // Prints "Woof!" because runtime type is Dog!
\`\`\``,
    contentStandard: `### Method Overriding vs Overloading, and \`super\`

#### Overriding vs Overloading
- **Method Overloading (Compile-Time Polymorphism)**: Same method name in the same class, with different parameter signatures. Resolved by the compiler based on argument types.
- **Method Overriding (Runtime Polymorphism)**: Subclass replaces a method inherited from a superclass with the exact same name, return type, and parameters. Annotated with \`@Override\`.

#### The \`super\` Keyword
Used to call the parent class's constructor or methods:
\`\`\`java
public class ElectricCar extends Car {
    private int batteryCapacityKwh;

    public ElectricCar(String brand, int batteryCapacityKwh) {
        super(brand); // Invokes Car(brand) constructor
        this.batteryCapacityKwh = batteryCapacityKwh;
    }
}
\`\`\`

#### Pattern Matching for \`instanceof\` (Java 16+)
Eliminates boilerplate typecasting:
\`\`\`java
if (myPet instanceof Dog dog) {
    dog.wagTail(); // dog variable is already cast and ready!
}
\`\`\``,
    contentDeep: `### Virtual Method Tables (vtables) & Polymorphic Inline Caches

#### How the JVM Dispatches Virtual Methods
In bytecode, method invocations use specific instructions:
1. \`invokevirtual\`: Standard virtual method dispatch (e.g. \`animal.speak()\`).
2. \`invokestatic\`: Calls static methods directly without dynamic dispatch.
3. \`invokespecial\`: Direct calls to private methods, constructors, or \`super\` methods.

For \`invokevirtual\`, every loaded class maintains a **vtable (virtual method table)** in Metaspace. The vtable contains function pointers to the concrete method implementations. Dynamic dispatch simply looks up the offset in the runtime object's vtable (O(1) table lookup).

#### JIT Inlining & Polymorphic Inline Caches (PIC)
When the HotSpot JIT compiler compiles hot call sites:
- **Monomorphic Call Site**: If 99% of calls invoke \`Dog.speak()\`, the JIT directly inlines \`Dog.speak()\` machine code with a quick class-check guard.
- **Megamorphic Call Site**: If many subclasses (Dog, Cat, Bird, Cow...) are invoked at the same call site, the JIT falls back to a vtable pointer lookup.`,
    visualization: {
      kind: 'graph',
      title: 'Inheritance Class Hierarchy',
      summary:
        'Directed acyclic graph illustrating Shape parent class extended by Circle and Rectangle',
      initial: {
        nodes: [
          { id: 'Animal', label: 'Animal (Base)', color: '#3b82f6' },
          { id: 'Dog', label: 'Dog (Subclass)', color: '#10b981' },
          { id: 'Cat', label: 'Cat (Subclass)', color: '#f59e0b' },
        ],
        edges: [
          { source: 'Dog', target: 'Animal', label: 'extends' },
          { source: 'Cat', target: 'Animal', label: 'extends' },
        ],
      },
      steps: [
        {
          line: 1,
          text: 'Animal defines base virtual method speak()',
          state: {
            nodes: [
              { id: 'Animal', label: 'Animal [speak()]', color: '#3b82f6' },
              { id: 'Dog', label: 'Dog', color: '#6b7280' },
              { id: 'Cat', label: 'Cat', color: '#6b7280' },
            ],
            edges: [
              { source: 'Dog', target: 'Animal', label: 'extends' },
              { source: 'Cat', target: 'Animal', label: 'extends' },
            ],
          },
        },
        {
          line: 2,
          text: 'Dog overrides speak() -> Woof!',
          state: {
            nodes: [
              { id: 'Animal', label: 'Animal', color: '#3b82f6' },
              { id: 'Dog', label: 'Dog [@Override speak()="Woof"]', color: '#10b981' },
              { id: 'Cat', label: 'Cat', color: '#6b7280' },
            ],
            edges: [
              { source: 'Dog', target: 'Animal', label: 'extends' },
              { source: 'Cat', target: 'Animal', label: 'extends' },
            ],
          },
        },
        {
          line: 3,
          text: 'Cat overrides speak() -> Meow!',
          state: {
            nodes: [
              { id: 'Animal', label: 'Animal', color: '#3b82f6' },
              { id: 'Dog', label: 'Dog', color: '#10b981' },
              { id: 'Cat', label: 'Cat [@Override speak()="Meow"]', color: '#f59e0b' },
            ],
            edges: [
              { source: 'Dog', target: 'Animal', label: 'extends' },
              { source: 'Cat', target: 'Animal', label: 'extends' },
            ],
          },
        },
      ],
    },
    codeStarter: `class Animal {
    public String speak() {
        return "Generic sound";
    }
}

class Dog extends Animal {
    @Override
    public String speak() {
        return "Woof!";
    }
}

class Cat extends Animal {
    @Override
    public String speak() {
        return "Meow!";
    }
}

public class Main {
    public static void main(String[] args) {
        Animal[] pets = { new Dog(), new Cat() };
        for (Animal pet : pets) {
            System.out.println(pet.speak());
        }
    }
}`,
    codeSolution: `class Animal {
    public String speak() {
        return "Generic sound";
    }
}

class Dog extends Animal {
    @Override
    public String speak() {
        return "Woof!";
    }
}

class Cat extends Animal {
    @Override
    public String speak() {
        return "Meow!";
    }
}

public class Main {
    public static void main(String[] args) {
        Animal[] pets = { new Dog(), new Cat() };
        for (Animal pet : pets) {
            System.out.println(pet.speak());
        }
    }
}`,
    commonMistakes: [
      {
        mistake: 'Invoking Overridable Methods Inside Constructors',
        explanation:
          'If a superclass constructor invokes an overridden method, the subclass method runs before the subclass constructor has initialized its fields.',
        badCode: 'public Parent() { init(); } // Subclass fields are null when init() runs!',
        goodCode: 'public Parent() { /* initialize only parent fields */ }',
      },
      {
        mistake: 'Confusing Overloading with Overriding',
        explanation:
          'Changing parameter types creates an overload instead of an override, preventing dynamic dispatch.',
        badCode:
          'public boolean equals(MyClass other) // Overload! Does not override Object.equals(Object)',
        goodCode: '@Override public boolean equals(Object other) // Correct override',
      },
    ],
    quiz: [
      {
        id: 'ip-q1',
        question:
          'Which bytecode instruction is used by the JVM for standard virtual method dynamic dispatch?',
        options: ['invokevirtual', 'invokestatic', 'invokespecial', 'invokedynamic'],
        answerIndex: 0,
        explanation:
          'invokevirtual is the bytecode instruction responsible for looking up method implementations via runtime vtables.',
      },
      {
        id: 'ip-q2',
        question: 'What is the purpose of the @Override annotation in Java?',
        options: [
          'It makes the method execute 2x faster',
          'It tells the compiler to verify that the method actually overrides a superclass method, catching typos at compile-time',
          'It allows private methods to be accessed externally',
          'It prevents child classes from modifying the method',
        ],
        answerIndex: 1,
        explanation:
          '@Override instructs the compiler to verify signature compatibility, failing compilation if no matching superclass method exists.',
      },
      {
        id: 'ip-q3',
        question:
          'Can a class extend multiple classes simultaneously in Java (Multiple Inheritance)?',
        options: [
          'Yes, using commas: class C extends A, B',
          'No, Java permits single class inheritance only (classes can implement multiple interfaces)',
          'Yes, if both classes are abstract',
          'Only in Java 21+',
        ],
        answerIndex: 1,
        explanation:
          'Java enforces single class inheritance to avoid the Diamond Problem, though classes may implement multiple interfaces.',
      },
      {
        id: 'ip-q4',
        question:
          'What data structure in HotSpot Metaspace maps virtual method offsets to concrete addresses?',
        options: ['vtable (Virtual Method Table)', 'Linked List', 'B-Tree', 'Hash Set'],
        answerIndex: 0,
        explanation:
          'HotSpot stores a vtable in each class metadata definition, enabling O(1) indexed method pointer dispatch.',
      },
      {
        id: 'ip-q5',
        question:
          'What happens when a call site is monomorphic (always called on the exact same concrete class)?',
        options: [
          'The call is cancelled',
          'The JIT compiler can inline the target method directly, eliminating method call overhead',
          'It throws a MegamorphicException',
          'It forces interpreted mode',
        ],
        answerIndex: 1,
        explanation:
          'Monomorphic inline caches allow the JIT compiler to inline the callee body directly with a speculative type check.',
      },
    ],
    challenge: {
      prompt:
        'Implement an abstract class `Shape` with abstract method `double area()`. Create a subclass `Circle` with constructor `Circle(double radius)` implementing `area()` as `Math.PI * radius * radius`. Throw `IllegalArgumentException` if radius is negative.',
      starterCode: `abstract class Shape {
    public abstract double area();
}

class Circle extends Shape {
    // Write your fields, constructor, and area() method here
    public double area() { return 0.0; }
}`,
      solutionCode: `abstract class Shape {
    public abstract double area();
}

class Circle extends Shape {
    private double radius;

    public Circle(double radius) {
        if (radius < 0) throw new IllegalArgumentException("Negative radius");
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}`,
      testCode: `public class TestHarness {
    public static void main(String[] args) {
        Shape c = new Circle(10.0);
        double expected = Math.PI * 100.0;
        if (Math.abs(c.area() - expected) > 1e-6) throw new AssertionError("Failed area calculation");
        boolean caught = false;
        try {
            new Circle(-1.0);
        } catch (IllegalArgumentException e) {
            caught = true;
        }
        if (!caught) throw new AssertionError("Failed negative radius validation");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'Declare radius as a private double in Circle.',
        'Validate radius >= 0 in the Circle constructor.',
        'Use Math.PI * radius * radius for area calculation.',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 6. OOP: interfaces-abstract
  // ===========================================================================
  {
    slug: 'interfaces-abstract',
    title: 'Abstraction, Interfaces & Default Methods',
    track: 'oop',
    module: 'Object Fundamentals',
    orderIndex: 6,
    published: true,
    difficulty: 'MEDIUM',
    estimatedMinutes: 25,
    hook: 'A standard USB-C port does not care whether you plug in a flash drive, an external monitor, or a power cable. It defines a universal physical interface contract. Any device adhering to the contract works seamlessly.',
    contentSimple: `### Abstract Classes vs Interfaces

Both abstract classes and interfaces allow you to define contracts without prescribing complete implementation details:

| Feature | Abstract Class | Interface |
| :--- | :--- | :--- |
| **Inheritance** | Single class inheritance (\`extends\`) | Multiple implementation (\`implements A, B\`) |
| **State** | Can have instance variables and state | Only \`public static final\` constants |
| **Constructors** | Can define constructors | No constructors allowed |
| **Purpose** | Shared base code and core identity | Behavioral capability contract |

\`\`\`java
public interface Printable {
    void print(); // Abstract method contract
}
\`\`\``,
    contentStandard: `### Default Methods, Static Methods & Conflict Resolution

#### Default Methods (Java 8+)
Default methods allow interfaces to provide default implementation code, enabling backward-compatible library evolution:
\`\`\`java
public interface Sized {
    int size();

    default boolean isEmpty() {
        return size() == 0;
    }
}
\`\`\`

#### Diamond Problem & Conflict Resolution
If a class implements two interfaces that provide the same default method signature, the compiler forces the class to override and disambiguate:
\`\`\`java
public class ConflictResolver implements InterfaceA, InterfaceB {
    @Override
    public void execute() {
        InterfaceA.super.execute(); // Explicitly choose InterfaceA
    }
}
\`\`\`

#### Functional Interfaces (\`@FunctionalInterface\`)
An interface with **exactly one abstract method** is a Functional Interface. It can be implemented using concise lambda expressions:
\`\`\`java
@FunctionalInterface
public interface Validator<T> {
    boolean isValid(T item);
}
\`\`\``,
    contentDeep: `### Interface Tables (itables) & invokedynamic

#### Interface Method Table (itable)
Unlike \`invokevirtual\` where a method offset in the vtable is known at class load time, a class can implement dozens of unrelated interfaces in any arbitrary order.
- To handle interface dispatch, HotSpot generates **itables (interface tables)** for each class.
- When executing \`invokeinterface\`, the JVM searches the itables to find the matching method offset.
- HotSpot optimizes this by caching recent lookups in inline caches to achieve near-vtable speed.

#### Default Methods and Method Resolution Order
When resolving method calls, Java applies three rules in order:
1. **Classes win over interfaces**: A method declaration in a class or superclass takes precedence over any default method.
2. **More specific interfaces win**: An interface extending another interface wins over the super-interface.
3. **Otherwise, explicit override required**: If two independent interfaces conflict, compilation fails unless the implementor overrides the method.`,
    visualization: {
      kind: 'graph',
      title: 'Interface Implementation Contract',
      summary: 'PaymentService class implementing both Auditable and Encryptable interfaces',
      initial: {
        nodes: [
          { id: 'Auditable', label: '«interface» Auditable', color: '#8b5cf6' },
          { id: 'Encryptable', label: '«interface» Encryptable', color: '#8b5cf6' },
          { id: 'PaymentService', label: 'PaymentService', color: '#10b981' },
        ],
        edges: [
          { source: 'PaymentService', target: 'Auditable', label: 'implements' },
          { source: 'PaymentService', target: 'Encryptable', label: 'implements' },
        ],
      },
      steps: [
        {
          line: 1,
          text: 'Auditable declares audit() contract; Encryptable declares encrypt()',
          state: {
            nodes: [
              { id: 'Auditable', label: 'Auditable [audit()]', color: '#8b5cf6' },
              { id: 'Encryptable', label: 'Encryptable [encrypt()]', color: '#8b5cf6' },
              { id: 'PaymentService', label: 'PaymentService', color: '#6b7280' },
            ],
            edges: [
              { source: 'PaymentService', target: 'Auditable', label: 'implements' },
              { source: 'PaymentService', target: 'Encryptable', label: 'implements' },
            ],
          },
        },
        {
          line: 2,
          text: 'PaymentService fulfills both contracts through concrete implementations',
          state: {
            nodes: [
              { id: 'Auditable', label: 'Auditable', color: '#8b5cf6' },
              { id: 'Encryptable', label: 'Encryptable', color: '#8b5cf6' },
              {
                id: 'PaymentService',
                label: 'PaymentService [audit(), encrypt()]',
                color: '#10b981',
              },
            ],
            edges: [
              { source: 'PaymentService', target: 'Auditable', label: 'implements' },
              { source: 'PaymentService', target: 'Encryptable', label: 'implements' },
            ],
          },
        },
      ],
    },
    codeStarter: `interface Validator {
    boolean isValid(String input);

    default boolean isInvalid(String input) {
        return !isValid(input);
    }
}

class EmailValidator implements Validator {
    @Override
    public boolean isValid(String input) {
        return input != null && input.contains("@");
    }
}

public class Main {
    public static void main(String[] args) {
        Validator val = new EmailValidator();
        System.out.println("Valid: " + val.isValid("user@javaverse.local"));
        System.out.println("Invalid: " + val.isInvalid("plain-text"));
    }
}`,
    codeSolution: `interface Validator {
    boolean isValid(String input);

    default boolean isInvalid(String input) {
        return !isValid(input);
    }
}

class EmailValidator implements Validator {
    @Override
    public boolean isValid(String input) {
        return input != null && input.contains("@");
    }
}

public class Main {
    public static void main(String[] args) {
        Validator val = new EmailValidator();
        System.out.println("Valid: " + val.isValid("user@javaverse.local"));
        System.out.println("Invalid: " + val.isInvalid("plain-text"));
    }
}`,
    commonMistakes: [
      {
        mistake: 'Declaring Mutable Instance State in Interfaces',
        explanation:
          'All fields declared in interfaces are implicitly public static final constants.',
        badCode: 'interface Cache { int size = 0; } // size cannot be modified!',
        goodCode:
          'abstract class Cache { protected int size = 0; } // Use abstract class for state',
      },
      {
        mistake: 'Failing to Disambiguate Conflicting Default Methods',
        explanation:
          'If two interfaces have identical default methods, compilation fails unless the class overrides it.',
        badCode:
          'class Child implements A, B {} // Fails compilation if A and B have default void run()',
        goodCode: 'class Child implements A, B { @Override public void run() { A.super.run(); } }',
      },
    ],
    quiz: [
      {
        id: 'ia-q1',
        question: 'What modifier is automatically applied to fields declared in an interface?',
        options: ['private final', 'public static final', 'protected abstract', 'volatile'],
        answerIndex: 1,
        explanation: 'All fields in an interface are implicitly public static final constants.',
      },
      {
        id: 'ia-q2',
        question: 'How many abstract methods can a @FunctionalInterface have?',
        options: ['Zero', 'Exactly one', 'Up to three', 'Unlimited'],
        answerIndex: 1,
        explanation:
          'A functional interface must contain exactly one abstract method (default and static methods do not count).',
      },
      {
        id: 'ia-q3',
        question:
          'When a superclass and an interface both provide a method with the same signature, which one wins?',
        options: [
          'The interface default method wins',
          'The superclass method wins',
          'Compilation error occurs',
          'The JVM picks randomly',
        ],
        answerIndex: 1,
        explanation:
          'Under Java method resolution rules, class implementations always take precedence over interface default methods.',
      },
      {
        id: 'ia-q4',
        question: 'Which bytecode instruction is used to invoke a method declared on an interface?',
        options: ['invokevirtual', 'invokeinterface', 'invokestatic', 'invokespecial'],
        answerIndex: 1,
        explanation:
          'invokeinterface is the dedicated bytecode instruction for interface method invocations.',
      },
      {
        id: 'ia-q5',
        question: 'Can an interface define a constructor?',
        options: [
          'Yes, default constructors only',
          'No, interfaces cannot define constructors',
          'Yes, if it has default methods',
          'Only private constructors are allowed',
        ],
        answerIndex: 1,
        explanation: 'Interfaces cannot have instance state and cannot define constructors.',
      },
    ],
    challenge: {
      prompt:
        'Define an interface `Transformer` with abstract method `String transform(String input)` and default method `int getLength(String input)` returning `transform(input).length()`. Implement class `UpperTransformer` returning the uppercase string.',
      starterCode: `interface Transformer {
    String transform(String input);
    // Add default method getLength here
}

class UpperTransformer implements Transformer {
    // Implement transform here
    public String transform(String input) { return ""; }
}`,
      solutionCode: `interface Transformer {
    String transform(String input);
    default int getLength(String input) {
        String res = transform(input);
        return res != null ? res.length() : 0;
    }
}

class UpperTransformer implements Transformer {
    @Override
    public String transform(String input) {
        return input != null ? input.toUpperCase() : "";
    }
}`,
      testCode: `public class TestHarness {
    public static void main(String[] args) {
        Transformer t = new UpperTransformer();
        if (!"JAVA".equals(t.transform("java"))) throw new AssertionError("Failed transform uppercase");
        if (t.getLength("java") != 4) throw new AssertionError("Failed default getLength method");
        if (t.getLength("") != 0) throw new AssertionError("Failed empty getLength");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'In Transformer, declare default int getLength(String input) returning transform(input).length().',
        'In UpperTransformer, implement transform(input) using input.toUpperCase().',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 7. DSA: arrays-arraylist
  // ===========================================================================
  {
    slug: 'arrays-arraylist',
    title: 'Contiguous Memory & Resizable Arrays',
    track: 'dsa',
    module: 'Linear Collections',
    orderIndex: 7,
    published: true,
    difficulty: 'EASY',
    estimatedMinutes: 20,
    hook: 'Think of an array like a reserved row of theater seats. Because each seat is numbered and spaced consecutively, you can jump directly to seat #5 instantaneously without counting every seat along the way.',
    contentSimple: `### What is an Array and an ArrayList?

An **Array** is a contiguous block of fixed memory cells storing elements of the same type:
- **Instant Access**: Accessing any element by index is instantaneous (\`O(1)\`) because the memory address is calculated with basic arithmetic: \`address = base + (index * elementSize)\`.
- **Fixed Size**: Once instantiated, native arrays cannot grow or shrink.

\`\`\`java
int[] numbers = new int[5];
numbers[0] = 10;
int first = numbers[0]; // O(1)
\`\`\`

#### ArrayList: The Dynamic Resizable Array
\`ArrayList<E>\` wraps an internal array and resizes dynamically when full:
\`\`\`java
List<String> list = new ArrayList<>();
list.add("Java");
list.add("Kotlin");
\`\`\``,
    contentStandard: `### Dynamic Growth Mechanics & Amortized Complexity

#### How ArrayList Grows
When the internal \`elementData\` array becomes full:
1. A new array is allocated with **1.5x capacity** (\`newCapacity = oldCapacity + (oldCapacity >> 1)\`).
2. \`System.arraycopy\` rapidly copies elements to the new array.
3. The old array becomes eligible for garbage collection.

#### Amortized O(1) Time Complexity
Although resizing takes O(N) to copy elements, resizing occurs exponentially less frequently as the list grows:
- Adding N elements triggers copy operations: \(1 + 2 + 4 + 8 + ... + N \approx 2N\).
- Average work per insertion = \(\frac{2N}{N} = O(1)\) (Amortized constant time).

#### Common Operations Complexity
- **Index lookup (\`get(i)\`)**: O(1)
- **Append (\`add(e)\`)**: Amortized O(1)
- **Insert / Remove at index**: O(N) due to element shifting.`,
    contentDeep: `### CPU Cache Locality & Primitive Array vs Boxed Object Memory

#### CPU Cache Lines (L1/L2 Cache)
Modern CPUs do not fetch single bytes from RAM; they fetch **64-byte Cache Lines**:
- **Primitive Array (\`int[]\`)**: Elements are stored strictly contiguously. Reading \`arr[0]\` pre-fetches \`arr[1]\` through \`arr[15]\` into L1 cache for near-instant access (Spatial Locality).
- **Boxed List (\`List<Integer>\`)**: Stores an array of 64-bit pointers pointing to disparate heap locations. Accessing elements triggers "pointer chasing" and frequent CPU cache misses, running up to 5-10x slower.

#### Fast Array Copying with \`System.arraycopy\`
\`System.arraycopy\` is an intrinsic JIT-compiled method translating directly to native hardware vector instructions (\`memmove\` / AVX-512) for blazing-fast block memory copies.`,
    visualization: {
      kind: 'array',
      title: 'ArrayList Dynamic Resizing (1.5x)',
      summary:
        'Observing internal array capacity expansion from 4 to 6 elements when reaching capacity',
      initial: {
        array: [10, 20, 30, 40],
        highlights: [0, 1, 2, 3],
        pointers: { size: 3 },
        labels: { 0: '10', 1: '20', 2: '30', 3: '40' },
      },
      steps: [
        {
          line: 1,
          text: 'Array is at full capacity (4 elements: 10, 20, 30, 40)',
          state: {
            array: [10, 20, 30, 40],
            highlights: [0, 1, 2, 3],
            pointers: { size: 3 },
            labels: { 0: '10', 1: '20', 2: '30', 3: '40' },
          },
        },
        {
          line: 2,
          text: 'add(50) triggers grow(): allocating new array of capacity 6 (1.5x)',
          state: {
            array: [10, 20, 30, 40, 0, 0],
            highlights: [4, 5],
            pointers: { newCap: 5 },
            labels: { 0: '10', 1: '20', 2: '30', 3: '40', 4: 'empty', 5: 'empty' },
          },
        },
        {
          line: 3,
          text: 'System.arraycopy transfers items, 50 inserted at index 4',
          state: {
            array: [10, 20, 30, 40, 50, 0],
            highlights: [4],
            pointers: { size: 4 },
            labels: { 0: '10', 1: '20', 2: '30', 3: '40', 4: '50 (new)', 5: 'empty' },
          },
        },
      ],
    },
    codeStarter: `import java.util.ArrayList;
import java.util.List;

public class ArrayDemo {
    public static void main(String[] args) {
        List<Integer> numbers = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            numbers.add(i * 10);
        }

        System.out.println("Element at index 2: " + numbers.get(2));
        System.out.println("Total elements: " + numbers.size());
    }
}`,
    codeSolution: `import java.util.ArrayList;
import java.util.List;

public class ArrayDemo {
    public static void main(String[] args) {
        List<Integer> numbers = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            numbers.add(i * 10);
        }

        System.out.println("Element at index 2: " + numbers.get(2));
        System.out.println("Total elements: " + numbers.size());
    }
}`,
    commonMistakes: [
      {
        mistake: 'Comparing Arrays with == or .equals()',
        explanation: 'Native array .equals() compares reference identity, not contents.',
        badCode: 'int[] a = {1, 2}; int[] b = {1, 2}; if (a.equals(b)) // Evaluates to false!',
        goodCode: 'if (Arrays.equals(a, b)) // Correct element-by-element comparison',
      },
      {
        mistake: 'Memory Leaks from Loitering References in Custom Arrays',
        explanation:
          'Removing an element without setting the array slot to null prevents garbage collection.',
        badCode: 'elements[--size]; // Reference loiters in internal array slot!',
        goodCode: 'elements[--size] = null; // Clear slot for garbage collection',
      },
    ],
    quiz: [
      {
        id: 'aa-q1',
        question: 'What is the time complexity of accessing an element by index in an array?',
        options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'],
        answerIndex: 0,
        explanation:
          'Array index access is O(1) constant time computed directly via base address + index * elementSize.',
      },
      {
        id: 'aa-q2',
        question: 'What is the default growth factor of ArrayList in HotSpot OpenJDK?',
        options: [
          '1.5x (oldCapacity + (oldCapacity >> 1))',
          '2.0x (double)',
          '10 elements added each time',
          '3.0x',
        ],
        answerIndex: 0,
        explanation:
          'HotSpot OpenJDK increases capacity by 50% (1.5x) when growing the internal buffer.',
      },
      {
        id: 'aa-q3',
        question: 'What is the amortized time complexity of appending an element to an ArrayList?',
        options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
        answerIndex: 0,
        explanation:
          'Appends run in amortized O(1) time because resize operations occur exponentially less frequently.',
      },
      {
        id: 'aa-q4',
        question:
          'Why are primitive arrays (int[]) faster for numeric processing than List<Integer>?',
        options: [
          'int[] has better CPU cache locality without pointer chasing and object boxing overhead',
          'List<Integer> is deprecated in Java 21',
          'int[] is processed on the GPU',
          'List<Integer> cannot store negative numbers',
        ],
        answerIndex: 0,
        explanation:
          'Primitive arrays store raw numbers contiguously in memory, leveraging 64-byte CPU cache lines without pointer indirection.',
      },
      {
        id: 'aa-q5',
        question:
          'Which method should be used to compare contents of two primitive arrays for equality?',
        options: ['Arrays.equals(a, b)', 'a.equals(b)', 'a == b', 'Arrays.compare(a, b) == 1'],
        answerIndex: 0,
        explanation:
          'Arrays.equals(a, b) compares actual array elements. a.equals(b) defaults to Object reference equality.',
      },
    ],
    challenge: {
      prompt:
        'Implement `public static int findMax(int[] arr)` returning the maximum value in an integer array. Throw `IllegalArgumentException` with "Array cannot be empty" if `arr` is null or empty.',
      starterCode: `class Solution {
    public static int findMax(int[] arr) {
        // Write your solution here
        return 0;
    }
}`,
      solutionCode: `class Solution {
    public static int findMax(int[] arr) {
        if (arr == null || arr.length == 0) {
            throw new IllegalArgumentException("Array cannot be empty");
        }
        int max = arr[0];
        for (int i = 1; i < arr.length; i++) {
            if (arr[i] > max) max = arr[i];
        }
        return max;
    }
}`,
      testCode: `public class TestHarness {
    public static void main(String[] args) {
        int[] data = { 3, 7, 2, 9, 4 };
        if (Solution.findMax(data) != 9) throw new AssertionError("Failed max detection");
        int[] single = { 42 };
        if (Solution.findMax(single) != 42) throw new AssertionError("Failed single element");
        boolean caught = false;
        try {
            Solution.findMax(new int[0]);
        } catch (IllegalArgumentException e) {
            caught = true;
        }
        if (!caught) throw new AssertionError("Failed empty array validation");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'Check for null or arr.length == 0 first.',
        'Initialize max with arr[0] and iterate through the rest of the array.',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 8. DSA: stacks-queues
  // ===========================================================================
  {
    slug: 'stacks-queues',
    title: 'LIFO, FIFO & The Double-Ended Queue',
    track: 'dsa',
    module: 'Linear Collections',
    orderIndex: 8,
    published: true,
    difficulty: 'MEDIUM',
    estimatedMinutes: 20,
    hook: 'A stack of cafeteria plates operates strictly on Last-In, First-Out (LIFO). The supermarket checkout line operates on First-In, First-Out (FIFO). In Java, one collection masterfully handles both: ArrayDeque.',
    contentSimple: `### Stacks (LIFO) and Queues (FIFO)

- **Stack (Last-In, First-Out)**: Elements are added and removed from the same end (the "top"). Think of browser back buttons or undo operations.
  - \`push(e)\`: Add to top
  - \`pop()\`: Remove and return top
  - \`peek()\`: Inspect top without removing
- **Queue (First-In, First-Out)**: Elements enter at the back (tail) and exit from the front (head). Think of printer job queues or message brokers.
  - \`offer(e)\`: Enqueue at tail
  - \`poll()\`: Dequeue from head
  - \`peek()\`: Inspect head

\`\`\`java
Deque<String> stack = new ArrayDeque<>();
stack.push("First");
stack.push("Second");
System.out.println(stack.pop()); // "Second" (LIFO)
\`\`\``,
    contentStandard: `### Modern Java Deque & Circular Buffers

#### Why \`java.util.Stack\` is Legacy & Deprecated
Never use the legacy \`java.util.Stack\` class:
- It extends \`Vector\`, which synchronizes every method with locks, adding severe synchronization performance penalties.
- It exposes indexed access (\`get(i)\`), violating pure stack semantics.
- **Recommended**: Always use \`Deque<E> stack = new ArrayDeque<>();\`.

#### Circular Array Queue Mechanics
\`ArrayDeque\` implements a circular ring buffer using power-of-two capacity:
- Maintains \`head\` and \`tail\` integer indices.
- Operations advance indices using bitwise masking: \`head = (head + 1) & (elements.length - 1)\`.
- Resizes when \`head == tail\`, achieving O(1) constant time without memory reallocations on every node.`,
    contentDeep: `### Memory Overhead: ArrayDeque vs LinkedList

#### Cache Locality vs Node Allocation
While \`LinkedList\` implements both \`List\` and \`Deque\`, it is almost always inferior in practice:
- **LinkedList**: Every element requires allocating a \`Node\` object on the heap:
  - 16-byte object header + 8-byte item ref + 8-byte next ref + 8-byte prev ref = **40 bytes of overhead per single element!**
  - Scattered node allocations cause severe CPU cache misses during traversal.
- **ArrayDeque**: Backed by a contiguous array of pointers:
  - Zero per-node object allocation overhead.
  - Sequential memory layout provides high CPU spatial locality.
  - Almost 3-5x faster than \`LinkedList\` for stack and queue workloads.`,
    visualization: {
      kind: 'stack',
      title: 'Stack Push and Pop Trace',
      summary: 'Observing elements pushed and popped from the LIFO stack data structure',
      initial: {
        stack: ['A'],
        highlights: [0],
        pointers: { top: 0 },
      },
      steps: [
        {
          line: 1,
          text: 'Initial state: stack contains element "A"',
          state: {
            stack: ['A'],
            highlights: [0],
            pointers: { top: 0 },
          },
        },
        {
          line: 2,
          text: 'push("B"): "B" placed on top of stack',
          state: {
            stack: ['A', 'B'],
            highlights: [1],
            pointers: { top: 1 },
          },
        },
        {
          line: 3,
          text: 'push("C"): "C" placed on top of stack',
          state: {
            stack: ['A', 'B', 'C'],
            highlights: [2],
            pointers: { top: 2 },
          },
        },
        {
          line: 4,
          text: 'pop() removes "C" (LIFO principle)',
          state: {
            stack: ['A', 'B'],
            highlights: [1],
            pointers: { top: 1 },
          },
        },
      ],
    },
    codeStarter: `import java.util.ArrayDeque;
import java.util.Deque;

public class StackDemo {
    public static boolean isBalanced(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') {
                stack.push(c);
            } else if (c == ')') {
                if (stack.isEmpty() || stack.pop() != '(') return false;
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        System.out.println("Balanced (()): " + isBalanced("(())"));
        System.out.println("Balanced ()): " + isBalanced("())"));
    }
}`,
    codeSolution: `import java.util.ArrayDeque;
import java.util.Deque;

public class StackDemo {
    public static boolean isBalanced(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') {
                stack.push(c);
            } else if (c == ')') {
                if (stack.isEmpty() || stack.pop() != '(') return false;
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        System.out.println("Balanced (()): " + isBalanced("(())"));
        System.out.println("Balanced ()): " + isBalanced("())"));
    }
}`,
    commonMistakes: [
      {
        mistake: 'Using Legacy java.util.Stack',
        explanation:
          'java.util.Stack extends Vector and synchronizes on every operation, causing thread contention.',
        badCode: 'Stack<Integer> s = new Stack<>(); // Legacy',
        goodCode: 'Deque<Integer> s = new ArrayDeque<>(); // Fast, modern, non-synchronized',
      },
      {
        mistake: 'Using LinkedList When ArrayDeque Is Faster',
        explanation:
          'LinkedList incurs 40 bytes per node overhead and poor cache locality compared to ArrayDeque.',
        badCode: 'Queue<Job> q = new LinkedList<>(); // Heavy node allocations',
        goodCode: 'Queue<Job> q = new ArrayDeque<>(); // Contiguous ring buffer',
      },
    ],
    quiz: [
      {
        id: 'sq-q1',
        question: 'Which principle governs the order of retrieval in a Queue?',
        options: [
          'FIFO (First-In, First-Out)',
          'LIFO (Last-In, First-Out)',
          'Random access',
          'Priority order only',
        ],
        answerIndex: 0,
        explanation: 'Queues process elements in First-In, First-Out (FIFO) order.',
      },
      {
        id: 'sq-q2',
        question:
          'Which class is the modern recommended implementation for Stacks and Queues in Java?',
        options: [
          'java.util.Stack',
          'java.util.ArrayDeque',
          'java.util.Vector',
          'java.util.ArrayList',
        ],
        answerIndex: 1,
        explanation:
          'ArrayDeque is the modern, unsynchronized, circular-buffer implementation recommended for both stacks and queues.',
      },
      {
        id: 'sq-q3',
        question: 'What is the time complexity of push and pop operations on an ArrayDeque?',
        options: ['O(1) amortized', 'O(N)', 'O(log N)', 'O(N^2)'],
        answerIndex: 0,
        explanation: 'ArrayDeque operations run in amortized O(1) constant time.',
      },
      {
        id: 'sq-q4',
        question: 'Why does LinkedList have higher memory overhead than ArrayDeque?',
        options: [
          'LinkedList allocates a 40-byte Node object for every individual element stored',
          'LinkedList uses 128-bit integers',
          'LinkedList is written in C++',
          'LinkedList allocates 1 MB buffers',
        ],
        answerIndex: 0,
        explanation:
          'Every element in LinkedList requires an individual Node object containing object header, next pointer, and prev pointer.',
      },
      {
        id: 'sq-q5',
        question:
          'What method removes and returns the head of a Queue, returning null if empty instead of throwing an exception?',
        options: ['poll()', 'remove()', 'pop()', 'dequeue()'],
        answerIndex: 0,
        explanation:
          'poll() safely returns null if the queue is empty, whereas remove() throws NoSuchElementException.',
      },
    ],
    challenge: {
      prompt:
        'Implement `public static boolean isValidParentheses(String s)` checking if string `s` containing only characters `(`, `)`, `{`, `}`, `[`, `]` has matching and properly ordered brackets.',
      starterCode: `class Solution {
    public static boolean isValidParentheses(String s) {
        // Write your solution here using ArrayDeque
        return false;
    }
}`,
      solutionCode: `import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public static boolean isValidParentheses(String s) {
        if (s == null) return false;
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c);
            } else if (c == ')' || c == '}' || c == ']') {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if (c == ')' && top != '(') return false;
                if (c == '}' && top != '{') return false;
                if (c == ']' && top != '[') return false;
            }
        }
        return stack.isEmpty();
    }
}`,
      testCode: `public class TestHarness {
    public static void main(String[] args) {
        if (!Solution.isValidParentheses("()[]{}")) throw new AssertionError("Failed valid brackets");
        if (Solution.isValidParentheses("(]")) throw new AssertionError("Failed mismatched brackets");
        if (Solution.isValidParentheses("([)]")) throw new AssertionError("Failed interleaved brackets");
        if (!Solution.isValidParentheses("{[]}")) throw new AssertionError("Failed nested brackets");
        if (Solution.isValidParentheses(")")) throw new AssertionError("Failed unmatched closing bracket");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'Push opening brackets onto an ArrayDeque.',
        'When encountering a closing bracket, check stack.isEmpty() before calling pop().',
        'Verify that the stack is completely empty at the end.',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 9. DSA: binary-search
  // ===========================================================================
  {
    slug: 'binary-search',
    title: 'Divide and Conquer: Logarithmic Search',
    track: 'dsa',
    module: 'Searching & Algorithms',
    orderIndex: 9,
    published: true,
    difficulty: 'MEDIUM',
    estimatedMinutes: 20,
    hook: "If you were looking up a word in a printed 1,000-page dictionary, you wouldn't start at page 1 and flip through every page. You open the middle, see if your word comes before or after, and discard half the dictionary in one second.",
    contentSimple: `### The Power of Halving the Search Space

Binary Search finds the position of a target value within a **sorted array**:
- **Requirement**: The array **must already be sorted**.
- **Strategy**: Compare the target with the middle element:
  - If equal, search is complete.
  - If target is smaller, search the left half.
  - If target is larger, search the right half.

#### Time Complexity: O(log N)
Searching through 1,000,000 items takes at most **20 comparisons** (\(2^{20} \approx 1,048,576\)).

\`\`\`java
public static int binarySearch(int[] arr, int target) {
    int low = 0;
    int high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2; // Prevents overflow!
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1; // Not found
}
\`\`\``,
    contentStandard: `### Loop Invariants & Preventing Integer Overflow

#### The Historic Overflow Bug
In early programming textbooks and early Java libraries, calculating the middle element was written as:
\`\`\`java
int mid = (low + high) / 2; // BUG!
\`\`\`
If \`low + high\` exceeds \`Integer.MAX_VALUE\` (2,147,483,647), it overflows to a negative number, resulting in an \`ArrayIndexOutOfBoundsException\`.
**The Correct Formula**:
\`\`\`java
int mid = low + (high - low) / 2;
// Or bitwise unsigned shift:
int mid = (low + high) >>> 1;
\`\`\`

#### Lower Bound & Upper Bound Variants
Binary search can find the first or last occurrence of duplicated elements:
- **Lower Bound (First Index \(\ge target\))**: When \`arr[mid] >= target\`, narrow right: \`high = mid\`.
- **Upper Bound (First Index \(> target\))**: When \`arr[mid] > target\`, narrow right: \`high = mid\`.`,
    contentDeep: `### Logarithmic Proof & Hardware Branch Prediction

#### Mathematical Complexity Proof
At step 0, search space size = \(N\).
At step 1, size = \(\frac{N}{2}\).
At step \(k\), size = \(\frac{N}{2^k}\).
Search terminates when search space size is 1:
\[
\frac{N}{2^k} = 1 \implies 2^k = N \implies k = \log_2(N)
\]
Hence the time complexity is strictly \(\Theta(\log N)\).

#### Branch Prediction & Cache Considerations
Because each step jumps to a radically different memory offset, large binary searches on arrays exceeding L3 cache size (e.g. 100 MB arrays) suffer from cache misses on every single iteration. For high-performance searching in memory, B-trees or branchless binary search patterns (e.g. Eytzinger layout) are often preferred in database query engines.`,
    visualization: {
      kind: 'two_pointer',
      title: 'Binary Search Halving Steps',
      summary:
        'Observing low, mid, and high pointers narrowing the search space to find target value 23',
      initial: {
        array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
        left: 0,
        right: 9,
        target: 23,
      },
      steps: [
        {
          line: 4,
          text: 'Step 1: low=0 (2), high=9 (91), mid=4 (16). 16 < 23 -> narrow right',
          state: {
            array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
            left: 5,
            right: 9,
            target: 23,
          },
        },
        {
          line: 4,
          text: 'Step 2: low=5 (23), high=9 (91), mid=7 (56). 56 > 23 -> narrow left',
          state: {
            array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
            left: 5,
            right: 6,
            target: 23,
          },
        },
        {
          line: 4,
          text: 'Step 3: low=5 (23), high=6 (38), mid=5 (23). Target 23 found at index 5!',
          state: {
            array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
            left: 5,
            right: 5,
            target: 23,
          },
        },
      ],
    },
    codeStarter: `public class BinarySearchDemo {
    public static int search(int[] nums, int target) {
        int low = 0;
        int high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] sorted = { 3, 9, 14, 19, 25, 31, 42 };
        int idx = search(sorted, 25);
        System.out.println("Found 25 at index: " + idx);
    }
}`,
    codeSolution: `public class BinarySearchDemo {
    public static int search(int[] nums, int target) {
        int low = 0;
        int high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] sorted = { 3, 9, 14, 19, 25, 31, 42 };
        int idx = search(sorted, 25);
        System.out.println("Found 25 at index: " + idx);
    }
}`,
    commonMistakes: [
      {
        mistake: 'Calculating mid with (low + high) / 2',
        explanation:
          'Large values of low and high sum to a negative number due to integer overflow.',
        badCode: 'int mid = (low + high) / 2; // Can overflow',
        goodCode: 'int mid = low + (high - low) / 2;',
      },
      {
        mistake: 'Running Binary Search on Unsorted Data',
        explanation:
          'Binary search logic assumes elements are sorted. On unsorted data, it produces incorrect results.',
        badCode: 'int[] un = {5, 1, 9}; binarySearch(un, 1); // Fails randomly',
        goodCode: 'Arrays.sort(data); binarySearch(data, 1); // Always sort first',
      },
    ],
    quiz: [
      {
        id: 'bs-q1',
        question: 'What is the mandatory prerequisite before executing Binary Search on an array?',
        options: [
          'The array must contain only positive numbers',
          'The array must be sorted',
          'The array size must be a power of two',
          'The array must not contain duplicates',
        ],
        answerIndex: 1,
        explanation: 'Binary search depends on monotonic ordering; the array must be sorted.',
      },
      {
        id: 'bs-q2',
        question:
          'What is the maximum number of comparisons to find a target in a sorted array of 1,000,000 items?',
        options: ['1,000,000', '500,000', '20 comparisons', '100 comparisons'],
        answerIndex: 2,
        explanation: 'ceil(log2(1,000,000)) = 20 comparisons.',
      },
      {
        id: 'bs-q3',
        question: 'Why is mid calculated as low + (high - low) / 2 instead of (low + high) / 2?',
        options: [
          'It executes faster on the CPU',
          'It prevents integer overflow when low + high exceeds Integer.MAX_VALUE',
          'It handles floating-point numbers',
          'It is required by the Java compiler',
        ],
        answerIndex: 1,
        explanation:
          'low + high can exceed 2^31 - 1, causing a negative sum and ArrayIndexOutOfBoundsException.',
      },
      {
        id: 'bs-q4',
        question:
          'What value does java.util.Arrays.binarySearch return when an element is NOT found?',
        options: ['0', '-1', '-(insertionPoint + 1)', 'Throws NoSuchElementException'],
        answerIndex: 2,
        explanation:
          'Arrays.binarySearch returns -(insertionPoint + 1) to indicate where the key would be inserted while remaining distinguishable from index 0.',
      },
      {
        id: 'bs-q5',
        question: 'What is the space complexity of an iterative binary search implementation?',
        options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
        answerIndex: 0,
        explanation:
          'Iterative binary search uses only pointers (low, high, mid), requiring O(1) auxiliary space.',
      },
    ],
    challenge: {
      prompt:
        'Implement `public static int searchInsert(int[] nums, int target)` returning the index if found, or the index where it would be if inserted in order.',
      starterCode: `class Solution {
    public static int searchInsert(int[] nums, int target) {
        // Write your solution here
        return 0;
    }
}`,
      solutionCode: `class Solution {
    public static int searchInsert(int[] nums, int target) {
        int low = 0;
        int high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return low;
    }
}`,
      testCode: `public class TestHarness {
    public static void main(String[] args) {
        int[] nums = { 1, 3, 5, 6 };
        if (Solution.searchInsert(nums, 5) != 2) throw new AssertionError("Failed existing element");
        if (Solution.searchInsert(nums, 2) != 1) throw new AssertionError("Failed missing element in middle");
        if (Solution.searchInsert(nums, 7) != 4) throw new AssertionError("Failed missing element at end");
        if (Solution.searchInsert(nums, 0) != 0) throw new AssertionError("Failed missing element at beginning");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'Run standard binary search loop while low <= high.',
        'When the loop terminates without finding the target, the low pointer points exactly to the insertion position.',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 10. ADVANCED JAVA: generics-wildcards
  // ===========================================================================
  {
    slug: 'generics-wildcards',
    title: 'Type Erasure, Variance & PECS',
    track: 'advanced_java',
    module: 'Type Systems',
    orderIndex: 10,
    published: true,
    difficulty: 'HARD',
    estimatedMinutes: 25,
    hook: 'If you have a crate of Honeycrisp apples, is it also a crate of fruit? In everyday life, yes. But in programming, if you could pass a crate of apples to someone expecting a crate of fruit, they might put a banana in your apple crate. Generics prevent that disaster.',
    contentSimple: `### Why Java Needs Generics

Prior to Java 5, collections stored raw \`Object\` references, requiring dangerous manual casts and causing runtime \`ClassCastException\`s.

**Generics** provide compile-time type safety:
\`\`\`java
List<String> names = new ArrayList<>();
names.add("Alice");
String name = names.get(0); // No cast needed!
\`\`\`

#### Generic Classes & Methods
You can define your own parameterized types:
\`\`\`java
public class Box<T> {
    private T content;
    public void set(T item) { this.content = item; }
    public T get() { return this.content; }
}
\`\`\``,
    contentStandard: `### Subtyping, Wildcards & The PECS Principle

#### Generics Are Invariant
In Java:
- \`Integer\` is a subtype of \`Number\`.
- But \`List<Integer>\` is **NOT** a subtype of \`List<Number>\`!
  If it were, you could add a \`Double\` into a list of \`Integer\`s, corrupting memory.

#### Wildcards: \`? extends T\` vs \`? super T\`
To write flexible APIs that accept collections of subtypes or supertypes, use **wildcards**:
- **Upper-bounded wildcard (\`? extends T\`)**: Any subtype of T. You can **read** items as T, but cannot write.
- **Lower-bounded wildcard (\`? super T\`)**: Any supertype of T. You can **write** T items into it.

#### The PECS Rule: Producer Extends, Consumer Super
- If your method **reads/produces** data from a collection, use \`? extends T\`.
- If your method **writes/consumes** data into a collection, use \`? super T\`.
\`\`\`java
public static <T> void copy(List<? extends T> src, List<? super T> dest) {
    for (T item : src) {
        dest.add(item);
    }
}
\`\`\``,
    contentDeep: `### Type Erasure, Bridge Methods & Heap Pollution

#### Type Erasure
Java generics were designed with **backward compatibility** for legacy Java 1.4 bytecodes:
- At compile-time, generic type parameters (\`<T>\`) are verified by the compiler and then **erased**.
- Unbounded type \`T\` is erased to \`Object\`.
- Bounded type \`<T extends Number>\` is erased to \`Number\`.
- Casts are inserted automatically by the compiler at call sites.

Because of erasure:
- You cannot check \`if (obj instanceof List<String>)\` at runtime.
- You cannot create generic arrays: \`new T[10]\` is prohibited.

#### Synthetic Bridge Methods
When a subclass overrides a generic method with a specific type, the Java compiler synthesizes a **bridge method** with the erased signature to preserve polymorphic dynamic dispatch in bytecode.`,
    visualization: {
      kind: 'graph',
      title: 'PECS Type Hierarchy Relationships',
      summary: 'Variance diagram showing Number parent with Integer and Double child subtypes',
      initial: {
        nodes: [
          { id: 'Object', label: 'Object (Top)', color: '#3b82f6' },
          { id: 'Number', label: 'Number', color: '#10b981' },
          { id: 'Integer', label: 'Integer', color: '#f59e0b' },
          { id: 'Double', label: 'Double', color: '#ec4899' },
        ],
        edges: [
          { source: 'Number', target: 'Object', label: 'extends' },
          { source: 'Integer', target: 'Number', label: 'extends' },
          { source: 'Double', target: 'Number', label: 'extends' },
        ],
      },
      steps: [
        {
          line: 1,
          text: '? extends Number allows reading from Integer or Double as Number',
          state: {
            nodes: [
              { id: 'Object', label: 'Object', color: '#6b7280' },
              { id: 'Number', label: 'Number [Producer Extends]', color: '#10b981' },
              { id: 'Integer', label: 'Integer [Allowed Read]', color: '#f59e0b' },
              { id: 'Double', label: 'Double [Allowed Read]', color: '#ec4899' },
            ],
            edges: [
              { source: 'Number', target: 'Object', label: 'extends' },
              { source: 'Integer', target: 'Number', label: 'extends' },
              { source: 'Double', target: 'Number', label: 'extends' },
            ],
          },
        },
        {
          line: 2,
          text: '? super Integer allows writing Integer into List<Number> or List<Object>',
          state: {
            nodes: [
              { id: 'Object', label: 'Object [Allowed Write]', color: '#3b82f6' },
              { id: 'Number', label: 'Number [Allowed Write]', color: '#10b981' },
              { id: 'Integer', label: 'Integer [Consumer Super]', color: '#f59e0b' },
              { id: 'Double', label: 'Double', color: '#6b7280' },
            ],
            edges: [
              { source: 'Number', target: 'Object', label: 'extends' },
              { source: 'Integer', target: 'Number', label: 'extends' },
              { source: 'Double', target: 'Number', label: 'extends' },
            ],
          },
        },
      ],
    },
    codeStarter: `import java.util.ArrayList;
import java.util.List;

public class GenericsDemo {
    // Producer Extends: reads numbers and calculates sum
    public static double sumOfList(List<? extends Number> list) {
        double s = 0.0;
        for (Number n : list) {
            s += n.doubleValue();
        }
        return s;
    }

    public static void main(String[] args) {
        List<Integer> ints = List.of(1, 2, 3, 4);
        List<Double> doubles = List.of(1.5, 2.5);

        System.out.println("Int sum: " + sumOfList(ints));
        System.out.println("Double sum: " + sumOfList(doubles));
    }
}`,
    codeSolution: `import java.util.ArrayList;
import java.util.List;

public class GenericsDemo {
    public static double sumOfList(List<? extends Number> list) {
        double s = 0.0;
        for (Number n : list) {
            s += n.doubleValue();
        }
        return s;
    }

    public static void main(String[] args) {
        List<Integer> ints = List.of(1, 2, 3, 4);
        List<Double> doubles = List.of(1.5, 2.5);

        System.out.println("Int sum: " + sumOfList(ints));
        System.out.println("Double sum: " + sumOfList(doubles));
    }
}`,
    commonMistakes: [
      {
        mistake: 'Attempting to Add Elements to a ? extends Collection',
        explanation:
          'The compiler cannot know the concrete subtype at runtime, so all additions except null are rejected.',
        badCode:
          'List<? extends Number> list = new ArrayList<Integer>(); list.add(10); // Compile Error!',
        goodCode:
          'List<? super Integer> list = new ArrayList<Number>(); list.add(10); // OK with ? super',
      },
      {
        mistake: 'Trying to Instantiate a Generic Array',
        explanation: 'Due to type erasure, array component types must be reifiable at runtime.',
        badCode:
          'T[] arr = new T[10]; // Compile Error: Type parameter T cannot be instantiated directly',
        goodCode: 'T[] arr = (T[]) new Object[10]; // Suppress unchecked warning or use List<T>',
      },
    ],
    quiz: [
      {
        id: 'gw-q1',
        question: 'What does the PECS acronym stand for in Java API design?',
        options: [
          'Producer Extends, Consumer Super',
          'Private Encapsulation, Class Safety',
          'Pointer Execution, Code Segmentation',
          'Polymorphic Extraction, Casting Strategy',
        ],
        answerIndex: 0,
        explanation:
          'PECS stands for Producer Extends, Consumer Super, guiding wildcard selection for collections.',
      },
      {
        id: 'gw-q2',
        question: 'Is List<Integer> considered a subtype of List<Number> in Java?',
        options: [
          'Yes, because Integer is a subclass of Number',
          'No, Java generic types are strictly invariant',
          'Only when compiled with Java 21',
          'Yes, if marked with @Covariant',
        ],
        answerIndex: 1,
        explanation:
          'Java generics are invariant. List<Integer> is not a subtype of List<Number> to prevent heap pollution.',
      },
      {
        id: 'gw-q3',
        question: 'What happens to generic type parameters at runtime due to Type Erasure?',
        options: [
          'They remain fully reified in heap memory',
          'They are erased and replaced by their bound (e.g. Object or specified boundary class)',
          'They are converted into C++ templates',
          'They cause reflection exceptions',
        ],
        answerIndex: 1,
        explanation:
          'Type erasure removes generic parameters at compile time, replacing unbounded types with Object.',
      },
      {
        id: 'gw-q4',
        question: 'Can you write elements into a List<? extends Number>?',
        options: [
          'Yes, you can add any Number',
          'No, the compiler disallows adding any object except the literal null',
          'Only integers can be added',
          'Yes, if cast to (Number)',
        ],
        answerIndex: 1,
        explanation:
          'A collection bounded with ? extends cannot safely accept additions because the specific concrete subtype is unknown.',
      },
      {
        id: 'gw-q5',
        question: 'What are synthetic bridge methods generated by the Java compiler?',
        options: [
          'Methods that connect the JVM to C native libraries',
          'Compiler-generated methods that preserve polymorphic method dispatch when overriding generic methods with erased signatures',
          'Network socket connectors',
          'Garbage collector tracking hooks',
        ],
        answerIndex: 1,
        explanation:
          'Bridge methods reconcile erased superclass method signatures with specialized subclass implementations.',
      },
    ],
    challenge: {
      prompt:
        'Implement a generic utility method `public static <T> void copyAll(java.util.List<? extends T> source, java.util.List<? super T> destination)` that appends every item from source into destination.',
      starterCode: `import java.util.List;

class Solution {
    public static <T> void copyAll(List<? extends T> source, List<? super T> destination) {
        // Write your solution here using the PECS principle
    }
}`,
      solutionCode: `import java.util.List;

class Solution {
    public static <T> void copyAll(List<? extends T> source, List<? super T> destination) {
        if (source == null || destination == null) return;
        for (T item : source) {
            destination.add(item);
        }
    }
}`,
      testCode: `import java.util.ArrayList;
import java.util.List;

public class TestHarness {
    public static void main(String[] args) {
        List<Integer> ints = List.of(1, 2, 3);
        List<Number> nums = new ArrayList<>();
        Solution.copyAll(ints, nums);
        if (nums.size() != 3) throw new AssertionError("Failed to copy all items");
        if (nums.get(0).intValue() != 1) throw new AssertionError("Failed item content");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'Iterate over source items of type T and call destination.add(item).',
        'Check for null source and destination.',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 11. ADVANCED JAVA: streams-lambdas
  // ===========================================================================
  {
    slug: 'streams-lambdas',
    title: 'Functional Pipelines & Lazy Evaluation',
    track: 'advanced_java',
    module: 'Functional Programming',
    orderIndex: 11,
    published: true,
    difficulty: 'HARD',
    estimatedMinutes: 25,
    hook: 'An industrial assembly line does not manufacture 10,000 car chassis, let them pile up on the warehouse floor, then paint them all. Each car moves through cutting, assembling, and painting in one continuous stream. That is a Java Stream pipeline.',
    contentSimple: `### Declarative Data Processing with Streams

Introduced in Java 8, the **Stream API** lets you process sequences of elements declaratively:
- Instead of writing manual loops with temporary variables, you declare *what* transformations you want.

\`\`\`java
List<String> names = List.of("Alice", "Bob", "Charlie", "David");
List<String> result = names.stream()
    .filter(name -> name.length() > 4) // Keep names longer than 4 chars
    .map(String::toUpperCase)           // Convert to uppercase
    .toList();                          // Collect into immutable list (Java 16+)
// Result: ["ALICE", "CHARLIE", "DAVID"]
\`\`\`

#### Anatomy of a Stream Pipeline
1. **Source**: An array, collection, or I/O channel.
2. **Intermediate Operations**: Transform a stream into another stream (e.g. \`filter\`, \`map\`, \`sorted\`).
3. **Terminal Operation**: Produces a non-stream result (e.g. \`collect\`, \`forEach\`, \`reduce\`, \`count\`).`,
    contentStandard: `### Lazy Evaluation, Short-Circuiting & Collectors

#### Lazy Evaluation
Intermediate operations are **lazy**: they execute no computation until a terminal operation is called.
\`\`\`java
Stream<String> stream = names.stream()
    .filter(s -> {
        System.out.println("Filtering: " + s);
        return s.startsWith("A");
    }); // Nothing prints yet!
stream.findFirst(); // Terminal operation triggers execution!
\`\`\`

#### Short-Circuiting
Operations like \`findFirst()\`, \`anyMatch()\`, and \`limit(n)\` stop processing as soon as their condition is satisfied without inspecting remaining elements:
\`\`\`java
Stream.iterate(1, n -> n + 1) // Infinite stream!
    .filter(n -> n % 5 == 0)
    .limit(3)                 // Short-circuits after 3 matches!
    .forEach(System.out::println); // Prints 5, 10, 15
\`\`\`

#### Advanced Collectors
\`java.util.stream.Collectors\` provides grouping, partitioning, and aggregation:
\`\`\`java
Map<Integer, List<String>> byLength = names.stream()
    .collect(Collectors.groupingBy(String::length));
\`\`\``,
    contentDeep: `### invokedynamic, LambdaMetafactory & Loop Fusion

#### Bytecode: No Anonymous Classes
Unlike traditional anonymous classes (\`new Runnable() { ... }\`), Java lambdas do not compile to inner class \`.class\` files:
- The compiler emits an \`invokedynamic\` instruction pointing to \`LambdaMetafactory.metafactory()\`.
- At first invocation, the JVM dynamically spins a lightweight call site linking to a \`private static\` synthetic method holding the lambda body.
- This avoids disk I/O, class loader pollution, and memory footprint.

#### Loop Fusion
The Stream engine fuses consecutive intermediate operations into a single pass:
- An element passes through \`filter\` -> \`map\` -> \`consumer\` without creating intermediate collections in heap memory.
- For primitive streams (\`IntStream\`, \`LongStream\`), avoid boxing overhead by using \`mapToInt()\` or \`IntStream.range()\`.`,
    visualization: {
      kind: 'array',
      title: 'Stream Pipeline Element Transformation',
      summary:
        'Observing elements entering the pipeline, getting filtered, and mapping to squared values',
      initial: {
        array: [1, 2, 3, 4],
        highlights: [0],
        pointers: { step: 0 },
        labels: { 0: '1 (odd)', 1: '2 (even)', 2: '3 (odd)', 3: '4 (even)' },
      },
      steps: [
        {
          line: 2,
          text: 'Filter n % 2 == 0: 1 is discarded',
          state: {
            array: [0, 2, 3, 4],
            highlights: [0],
            pointers: { step: 0 },
            labels: { 0: 'DISCARDED', 1: '2 (even)', 2: '3 (odd)', 3: '4 (even)' },
          },
        },
        {
          line: 3,
          text: 'Filter n % 2 == 0: 2 matches! Map n * n -> 4',
          state: {
            array: [0, 4, 3, 4],
            highlights: [1],
            pointers: { step: 1 },
            labels: { 0: 'DISCARDED', 1: 'MAPPED (4)', 2: '3 (odd)', 3: '4 (even)' },
          },
        },
        {
          line: 2,
          text: 'Filter n % 2 == 0: 3 is discarded',
          state: {
            array: [0, 4, 0, 4],
            highlights: [2],
            pointers: { step: 2 },
            labels: { 0: 'DISCARDED', 1: 'MAPPED (4)', 2: 'DISCARDED', 3: '4 (even)' },
          },
        },
        {
          line: 3,
          text: 'Filter n % 2 == 0: 4 matches! Map n * n -> 16. Final collected: [4, 16]',
          state: {
            array: [0, 4, 0, 16],
            highlights: [1, 3],
            pointers: { step: 3 },
            labels: { 0: 'DISCARDED', 1: '4', 2: 'DISCARDED', 3: '16' },
          },
        },
      ],
    },
    codeStarter: `import java.util.List;

public class StreamDemo {
    public static void main(String[] args) {
        List<Integer> numbers = List.of(1, 2, 3, 4, 5, 6);

        // Filter even numbers, multiply by 10, and sum
        int sum = numbers.stream()
            .filter(n -> n % 2 == 0)
            .mapToInt(n -> n * 10)
            .sum();

        System.out.println("Sum of even multiples: " + sum);
    }
}`,
    codeSolution: `import java.util.List;

public class StreamDemo {
    public static void main(String[] args) {
        List<Integer> numbers = List.of(1, 2, 3, 4, 5, 6);

        int sum = numbers.stream()
            .filter(n -> n % 2 == 0)
            .mapToInt(n -> n * 10)
            .sum();

        System.out.println("Sum of even multiples: " + sum);
    }
}`,
    commonMistakes: [
      {
        mistake: 'Reusing an Already Consumed Stream',
        explanation:
          'Streams can only be traversed once. Calling terminal operations on a consumed stream throws IllegalStateException.',
        badCode:
          'Stream<String> s = list.stream(); s.forEach(...); s.count(); // Throws Exception!',
        goodCode: 'list.stream().forEach(...); long count = list.stream().count();',
      },
      {
        mistake: 'Mutating State in Parallel Streams',
        explanation:
          'Using side-effects like list.add() inside parallel streams causes race conditions and data corruption.',
        badCode: 'list.parallelStream().forEach(res::add); // Race condition!',
        goodCode: 'List<String> res = list.parallelStream().map(...).toList(); // Pure functional',
      },
    ],
    quiz: [
      {
        id: 'sl-q1',
        question: 'What triggers execution in a Java Stream pipeline?',
        options: [
          'Calling stream()',
          'Invoking an intermediate operation like filter()',
          'Invoking a terminal operation like toList() or sum()',
          'The garbage collector',
        ],
        answerIndex: 2,
        explanation:
          'Stream pipelines are lazily evaluated. Computations do not execute until a terminal operation is called.',
      },
      {
        id: 'sl-q2',
        question: 'What bytecode instruction and mechanism is used to implement lambdas in Java?',
        options: [
          'invokedynamic via LambdaMetafactory',
          'invokevirtual via anonymous inner class files',
          'eval() in JVM runtime',
          'C preprocessor macros',
        ],
        answerIndex: 0,
        explanation:
          'Java lambdas compile to invokedynamic instructions linked dynamically by LambdaMetafactory.',
      },
      {
        id: 'sl-q3',
        question:
          'What happens if you attempt to perform a terminal operation on a stream that has already been consumed?',
        options: [
          'The stream resets and starts over',
          'Throws IllegalStateException: stream has already been operated upon or closed',
          'Returns null',
          'Recompiles the pipeline',
        ],
        answerIndex: 1,
        explanation:
          'Java streams are single-use sequences. Traversing an already operated stream throws IllegalStateException.',
      },
      {
        id: 'sl-q4',
        question: 'Which of the following is a short-circuiting stream operation?',
        options: ['sorted()', 'findFirst()', 'collect()', 'map()'],
        answerIndex: 1,
        explanation:
          'findFirst() short-circuits as soon as an element matches, avoiding evaluation of remaining elements.',
      },
      {
        id: 'sl-q5',
        question:
          'Why should IntStream or LongStream be preferred over Stream<Integer> for numeric math?',
        options: [
          'They avoid boxing/unboxing overhead between primitives and wrapper objects',
          'They support negative numbers',
          'They run on multi-threading by default',
          'They can store strings',
        ],
        answerIndex: 0,
        explanation:
          'Primitive specialized streams avoid boxing heap allocations, providing superior memory efficiency and throughput.',
      },
    ],
    challenge: {
      prompt:
        'Implement `public static long countLongWords(java.util.List<String> words, int minLength)` returning the count of words with length >= minLength using Java Streams.',
      starterCode: `import java.util.List;

class Solution {
    public static long countLongWords(List<String> words, int minLength) {
        // Write your solution here using words.stream()
        return 0;
    }
}`,
      solutionCode: `import java.util.List;

class Solution {
    public static long countLongWords(List<String> words, int minLength) {
        if (words == null) return 0;
        return words.stream()
            .filter(w -> w != null && w.length() >= minLength)
            .count();
    }
}`,
      testCode: `import java.util.List;

public class TestHarness {
    public static void main(String[] args) {
        List<String> words = List.of("apple", "pie", "banana", "kiwi", "watermelon");
        if (Solution.countLongWords(words, 5) != 3) throw new AssertionError("Failed count of words >= 5 chars");
        if (Solution.countLongWords(words, 15) != 0) throw new AssertionError("Failed count of words >= 15 chars");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'Use words.stream().filter(...).count().',
        'Filter for non-null words with w.length() >= minLength.',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },

  // ===========================================================================
  // 12. ADVANCED JAVA: jvm-memory-model
  // ===========================================================================
  {
    slug: 'jvm-memory-model',
    title: 'Heap, Stack, Metaspace & Garbage Collection',
    track: 'advanced_java',
    module: 'JVM Internals',
    orderIndex: 12,
    published: true,
    difficulty: 'HARD',
    estimatedMinutes: 30,
    hook: 'A modern city has private residential homes (Heap), personal desks in office cubicles (Stack frames), the city planning records archive (Metaspace), and city sanitation trucks cleaning streets at scheduled hours (Garbage Collection). Understanding this zoning blueprint unlocks true JVM mastery.',
    contentSimple: `### The Core Memory Areas of the JVM

When a Java program executes on the Java Virtual Machine, memory is partitioned into distinct zones:

1. **Stack Memory (Thread-Private)**:
   - Every OS thread has its own private call stack.
   - Stores primitive local variables and reference pointers.
   - Extremely fast: allocation and deallocation happen automatically as methods are called and returned.
2. **Heap Memory (Shared Across All Threads)**:
   - Stores all object instances and array data created with \`new\`.
   - Managed automatically by the Garbage Collector.
3. **Metaspace (Off-Heap Shared Memory)**:
   - Stores class metadata, bytecode definitions, method tables, and constant pools.
   - Allocates from native OS memory (since Java 8, replacing PermGen).`,
    contentStandard: `### Generational Garbage Collection & Object Lifecycle

#### The Weak Generational Hypothesis
Most JVM Garbage Collectors are based on two empirical observations:
1. **Most allocated objects die very young** (short-lived temporary variables).
2. **Objects that survive multiple GC cycles tend to live for a long time**.

#### Heap Partitioning
To optimize collection, the Heap is partitioned into generations:
- **Young Generation**:
  - **Eden Space**: Where new objects are initially allocated.
  - **Survivor Spaces (S0 / S1)**: Objects that survive a Minor GC are copied back and forth between S0 and S1, incrementing their age counter in the object Mark Word.
- **Old (Tenured) Generation**:
  - When an object survives past a threshold (default 15 cycles, \`-XX:MaxTenuringThreshold\`), it is promoted to the Old Generation.
  - Collected less frequently via Major GC.

#### Modern Production Garbage Collectors
- **G1 GC (Garbage-First)**: Default in Java 9+. Partitions heap into 2048 equal regions, collecting regions with the most garbage first within target pause times.
- **ZGC (Z Garbage Collector)**: Ultra-low latency collector with sub-millisecond pauses even on terabyte-sized heaps.`,
    contentDeep: `### GC Roots, Safepoints & Memory Leak Mechanisms

#### What Is a GC Root?
An object is "alive" if it is reachable through a chain of references originating from a **GC Root**:
1. Active local variables in thread stack frames.
2. JNI global/local native pointers.
3. Static fields on loaded classes in Metaspace.
4. Active Thread objects.

#### Safepoints & Stop-The-World (STW) Pauses
To inspect references reliably, the JVM brings all application threads to a coordinated halt known as a **Safepoint**:
- JIT compilers insert safepoint polling checks into compiled loops and method return paths.
- Threads pause, roots are scanned, and mutators resume.

#### How "Memory Leaks" Occur in Java
Although Java has automatic garbage collection, memory leaks still occur when **unintended strong references linger to objects that are no longer needed**:
- Unbounded static collections: \`public static List<Event> cache = new ArrayList<>();\`
- Unregistered event listeners or callbacks.
- ThreadLocals in thread pools that are never cleared with \`threadLocal.remove()\`.`,
    visualization: {
      kind: 'jvm_memory',
      title: 'JVM Generational Heap & GC Roots',
      summary:
        'Observing thread stack frames referencing Heap objects across Eden and Tenured space',
      initial: {
        stack: [
          { name: 'session', value: '0x10A4', type: 'UserSession' },
          { name: 'tempId', value: '42', type: 'int' },
        ],
        heap: [
          {
            id: '0x10A4',
            className: 'UserSession (Old Gen)',
            fields: { userId: 101, active: true },
          },
          { id: '0x20F0', className: 'TempPayload (Eden)', fields: { bytes: 2048 } },
        ],
        metaspace: [
          { className: 'UserSession', methods: ['getId', 'invalidate'] },
          { className: 'TempPayload', methods: ['process'] },
        ],
      },
      steps: [
        {
          line: 1,
          text: 'Active stack frame references UserSession (0x10A4) in Old Gen and TempPayload in Eden',
          state: {
            stack: [
              { name: 'session', value: '0x10A4', type: 'UserSession' },
              { name: 'temp', value: '0x20F0', type: 'TempPayload' },
            ],
            heap: [
              { id: '0x10A4', className: 'UserSession (Old Gen)', fields: { userId: 101 } },
              { id: '0x20F0', className: 'TempPayload (Eden)', fields: { bytes: 2048 } },
            ],
            metaspace: [{ className: 'UserSession', methods: ['getId'] }],
          },
        },
        {
          line: 2,
          text: 'temp variable exits method scope: reference removed from stack frame',
          state: {
            stack: [{ name: 'session', value: '0x10A4', type: 'UserSession' }],
            heap: [
              { id: '0x10A4', className: 'UserSession (Old Gen)', fields: { userId: 101 } },
              {
                id: '0x20F0',
                className: 'TempPayload (Unreachable Garbage)',
                fields: { bytes: 2048 },
              },
            ],
            metaspace: [{ className: 'UserSession', methods: ['getId'] }],
          },
        },
        {
          line: 3,
          text: 'Minor GC runs: 0x20F0 reclaimed from Eden. UserSession remains strongly referenced.',
          state: {
            stack: [{ name: 'session', value: '0x10A4', type: 'UserSession' }],
            heap: [{ id: '0x10A4', className: 'UserSession (Old Gen)', fields: { userId: 101 } }],
            metaspace: [{ className: 'UserSession', methods: ['getId'] }],
          },
        },
      ],
    },
    codeStarter: `public class MemoryDemo {
    public static void main(String[] args) {
        Runtime rt = Runtime.getRuntime();
        long totalMemory = rt.totalMemory();
        long freeMemory = rt.freeMemory();
        long maxMemory = rt.maxMemory();

        System.out.printf("Total JVM Memory: %,d MB%n", totalMemory / (1024 * 1024));
        System.out.printf("Free JVM Memory:  %,d MB%n", freeMemory / (1024 * 1024));
        System.out.printf("Max JVM Memory:   %,d MB%n", maxMemory / (1024 * 1024));
    }
}`,
    codeSolution: `public class MemoryDemo {
    public static void main(String[] args) {
        Runtime rt = Runtime.getRuntime();
        long totalMemory = rt.totalMemory();
        long freeMemory = rt.freeMemory();
        long maxMemory = rt.maxMemory();

        System.out.printf("Total JVM Memory: %,d MB%n", totalMemory / (1024 * 1024));
        System.out.printf("Free JVM Memory:  %,d MB%n", freeMemory / (1024 * 1024));
        System.out.printf("Max JVM Memory:   %,d MB%n", maxMemory / (1024 * 1024));
    }
}`,
    commonMistakes: [
      {
        mistake: 'Assuming System.gc() Forces Immediate Garbage Collection',
        explanation:
          'System.gc() is only a hint to the JVM. The HotSpot JVM may ignore it entirely, especially with -XX:+DisableExplicitGC.',
        badCode: 'System.gc(); // Does not guarantee execution or synchronous reclaim',
        goodCode: '// Let the JVM garbage collector tune and schedule collections automatically',
      },
      {
        mistake: 'Holding Static References in Listeners or Caches',
        explanation:
          'Static variables remain referenced by class metadata forever, preventing objects from being garbage collected.',
        badCode:
          'public static final List<Listener> LISTENERS = new ArrayList<>(); // Never cleared!',
        goodCode: 'Use WeakReference or clean up with listeners.remove(listener) in close()',
      },
    ],
    quiz: [
      {
        id: 'mm-q1',
        question:
          'Where is class metadata, method tables, and constant pools stored in modern Java (Java 8+)?',
        options: [
          'Permanent Generation (PermGen)',
          'Native Metaspace (Off-Heap)',
          'Java Thread Stack',
          'Eden Space',
        ],
        answerIndex: 1,
        explanation:
          'Since Java 8, class metadata is stored in native Metaspace off-heap, replacing PermGen.',
      },
      {
        id: 'mm-q2',
        question:
          'What is the default garbage collector in modern LTS Java releases (Java 17 & 21)?',
        options: ['Serial GC', 'Parallel GC', 'G1 GC (Garbage-First)', 'ZGC'],
        answerIndex: 2,
        explanation:
          'G1 GC is the default garbage collector in Java 17 and 21 on multi-core server JVM configurations.',
      },
      {
        id: 'mm-q3',
        question: 'Which of the following is considered a valid Garbage Collection Root (GC Root)?',
        options: [
          'An unreachable object in Eden space',
          'An active local variable in a thread call stack frame',
          'A null pointer',
          'A discarded intermediate stream element',
        ],
        answerIndex: 1,
        explanation: 'Active local variables in thread stack frames are primary GC roots.',
      },
      {
        id: 'mm-q4',
        question: 'What is the Weak Generational Hypothesis?',
        options: [
          'Generics are slow on the JVM',
          'Most objects die very young; surviving objects tend to persist for a long time',
          'Java programs should only use 32-bit pointers',
          'Metaspace never runs out of memory',
        ],
        answerIndex: 1,
        explanation:
          'The generational hypothesis states that the overwhelming majority of allocated objects die shortly after allocation.',
      },
      {
        id: 'mm-q5',
        question: 'How do memory leaks occur in Java despite automatic garbage collection?',
        options: [
          'The CPU deletes variables incorrectly',
          'Unintended strong references keep unneeded objects connected to an active GC root',
          'Stack frames are never popped',
          'Java 21 disabled the garbage collector',
        ],
        answerIndex: 1,
        explanation:
          'Memory leaks occur when objects that are logically dead remain strongly reachable from roots like static caches or uncleared listeners.',
      },
    ],
    challenge: {
      prompt:
        'Implement `public static boolean isEligibleForGC(boolean hasStackRef, boolean hasStaticRef)` returning true if an object is unreachable and eligible for garbage collection (i.e. has neither stack reference nor static reference).',
      starterCode: `class Solution {
    public static boolean isEligibleForGC(boolean hasStackRef, boolean hasStaticRef) {
        // Write your solution here
        return false;
    }
}`,
      solutionCode: `class Solution {
    public static boolean isEligibleForGC(boolean hasStackRef, boolean hasStaticRef) {
        return !hasStackRef && !hasStaticRef;
    }
}`,
      testCode: `public class TestHarness {
    public static void main(String[] args) {
        if (!Solution.isEligibleForGC(false, false)) throw new AssertionError("Failed unreferenced GC eligibility");
        if (Solution.isEligibleForGC(true, false)) throw new AssertionError("Failed stack-referenced object should not be GC eligible");
        if (Solution.isEligibleForGC(false, true)) throw new AssertionError("Failed static-referenced object should not be GC eligible");
        if (Solution.isEligibleForGC(true, true)) throw new AssertionError("Failed fully-referenced object");
        System.out.println("All test assertions passed successfully!");
    }
}`,
      hints: [
        'An object is eligible for GC only if both hasStackRef and hasStaticRef are false.',
        'Return !hasStackRef && !hasStaticRef.',
      ],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  },
];
