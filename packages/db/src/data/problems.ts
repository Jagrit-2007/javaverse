export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
}

export interface PracticeProblemData {
  slug: string;
  title: string;
  topic: 'CORE_JAVA' | 'OOP' | 'DSA' | 'ADVANCED_JAVA';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  orderIndex: number;
  prompt: string;
  starterCode: string;
  solutionCode: string;
  sampleTests: TestCase[];
  hiddenTests: TestCase[];
  hints: string[];
  testHarness: string;
  published: boolean;
}

export const PRACTICE_PROBLEMS: PracticeProblemData[] = [
  // 1. Two Sum Array
  {
    slug: 'two-sum-array',
    title: 'Two Sum Array',
    topic: 'CORE_JAVA',
    difficulty: 'EASY',
    orderIndex: 1,
    prompt: `Given an array of integers \`nums\` and an integer \`target\`, return the 0-based indices of the two numbers such that they add up to \`target\`.

You may assume that each input has exactly one valid solution, and you may not use the same element twice. Return the indices in ascending order \`[index1, index2]\`.

### Example 1
- **Input:** \`nums = [2, 7, 11, 15], target = 9\`
- **Output:** \`[0, 1]\`
- **Explanation:** Because \`nums[0] + nums[1] == 2 + 7 == 9\`, we return \`[0, 1]\`.

### Example 2
- **Input:** \`nums = [3, 2, 4], target = 6\`
- **Output:** \`[1, 2]\`

### Constraints
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- Only one valid answer exists.`,
    starterCode: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Implement your solution here
        return new int[2];
    }
}`,
    solutionCode: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}`,
    sampleTests: [
      {
        id: 'sample-1',
        name: 'Sample 1: nums=[2,7,11,15], target=9',
        input: '[2,7,11,15], 9',
        expectedOutput: '[0, 1]',
      },
      {
        id: 'sample-2',
        name: 'Sample 2: nums=[3,2,4], target=6',
        input: '[3,2,4], 6',
        expectedOutput: '[1, 2]',
      },
    ],
    hiddenTests: [
      {
        id: 'hidden-1',
        name: 'Hidden 1: nums=[3,3], target=6',
        input: '[3,3], 6',
        expectedOutput: '[0, 1]',
      },
      {
        id: 'hidden-2',
        name: 'Hidden 2: Negative numbers [-1,-2,-3,-4,-5], target=-8',
        input: '[-1,-2,-3,-4,-5], -8',
        expectedOutput: '[2, 4]',
      },
      {
        id: 'hidden-3',
        name: 'Hidden 3: Large values [100,200,300,400], target=700',
        input: '[100,200,300,400], 700',
        expectedOutput: '[2, 3]',
      },
    ],
    hints: [
      'A brute force approach checks all pairs in O(n^2) time. Can you do this in a single pass?',
      'Consider using a HashMap to store the numbers you have seen so far along with their indices.',
      'For each element x, check if (target - x) is already present in your map. If so, return [map.get(target - x), current_index].',
    ],
    testHarness: `import java.util.Arrays;

public class TestHarness {
    public static void main(String[] args) {
        Solution sol = new Solution();
        String mode = args.length > 0 ? args[0] : "all";

        // Sample 1
        int[] r1 = sol.twoSum(new int[]{2, 7, 11, 15}, 9);
        Arrays.sort(r1);
        if (r1.length == 2 && r1[0] == 0 && r1[1] == 1) {
            System.out.println("TEST_PASSED: sample-1");
        } else {
            System.err.println("TEST_FAILED: sample-1 Expected [0, 1] got " + Arrays.toString(r1));
        }

        // Sample 2
        int[] r2 = sol.twoSum(new int[]{3, 2, 4}, 6);
        Arrays.sort(r2);
        if (r2.length == 2 && r2[0] == 1 && r2[1] == 2) {
            System.out.println("TEST_PASSED: sample-2");
        } else {
            System.err.println("TEST_FAILED: sample-2 Expected [1, 2] got " + Arrays.toString(r2));
        }

        if ("sample".equals(mode)) return;

        // Hidden 1
        int[] r3 = sol.twoSum(new int[]{3, 3}, 6);
        Arrays.sort(r3);
        if (r3.length == 2 && r3[0] == 0 && r3[1] == 1) {
            System.out.println("TEST_PASSED: hidden-1");
        } else {
            System.err.println("TEST_FAILED: hidden-1 Expected [0, 1] got " + Arrays.toString(r3));
        }

        // Hidden 2
        int[] r4 = sol.twoSum(new int[]{-1, -2, -3, -4, -5}, -8);
        Arrays.sort(r4);
        if (r4.length == 2 && r4[0] == 2 && r4[1] == 4) {
            System.out.println("TEST_PASSED: hidden-2");
        } else {
            System.err.println("TEST_FAILED: hidden-2 Expected [2, 4] got " + Arrays.toString(r4));
        }

        // Hidden 3
        int[] r5 = sol.twoSum(new int[]{100, 200, 300, 400}, 700);
        Arrays.sort(r5);
        if (r5.length == 2 && r5[0] == 2 && r5[1] == 3) {
            System.out.println("TEST_PASSED: hidden-3");
        } else {
            System.err.println("TEST_FAILED: hidden-3 Expected [2, 3] got " + Arrays.toString(r5));
        }
    }
}`,
    published: true,
  },

  // 2. Palindrome Number
  {
    slug: 'palindrome-number',
    title: 'Palindrome Number',
    topic: 'CORE_JAVA',
    difficulty: 'EASY',
    orderIndex: 2,
    prompt: `Given an integer \`x\`, return \`true\` if \`x\` is a palindrome, and \`false\` otherwise.

An integer is a palindrome when it reads the same forward and backward. For example, \`121\` is a palindrome while \`123\` is not.

**Follow-up:** Could you solve it without converting the integer to a string?

### Example 1
- **Input:** \`x = 121\`
- **Output:** \`true\`

### Example 2
- **Input:** \`x = -121\`
- **Output:** \`false\`
- **Explanation:** Reads \`-121\` from left to right and \`121-\` from right to left.

### Constraints
- \`-2^31 <= x <= 2^31 - 1\``,
    starterCode: `class Solution {
    public boolean isPalindrome(int x) {
        // Implement your solution without string conversion
        return false;
    }
}`,
    solutionCode: `class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) {
            return false;
        }
        int reverted = 0;
        while (x > reverted) {
            reverted = reverted * 10 + x % 10;
            x /= 10;
        }
        return x == reverted || x == reverted / 10;
    }
}`,
    sampleTests: [
      { id: 'sample-1', name: 'Sample 1: x = 121', input: '121', expectedOutput: 'true' },
      { id: 'sample-2', name: 'Sample 2: x = -121', input: '-121', expectedOutput: 'false' },
      { id: 'sample-3', name: 'Sample 3: x = 10', input: '10', expectedOutput: 'false' },
    ],
    hiddenTests: [
      { id: 'hidden-1', name: 'Hidden 1: x = 0', input: '0', expectedOutput: 'true' },
      { id: 'hidden-2', name: 'Hidden 2: x = 1221', input: '1221', expectedOutput: 'true' },
      { id: 'hidden-3', name: 'Hidden 3: x = 1234321', input: '1234321', expectedOutput: 'true' },
      { id: 'hidden-4', name: 'Hidden 4: x = 1000021', input: '1000021', expectedOutput: 'false' },
    ],
    hints: [
      'Negative numbers cannot be palindromes because the negative sign is only on the front.',
      'Numbers ending in zero cannot be palindromes unless the number is zero itself.',
      'You can reverse half the number by popping digits with x % 10 and dividing x by 10, stopping when x <= reversed.',
    ],
    testHarness: `public class TestHarness {
    public static void main(String[] args) {
        Solution sol = new Solution();
        String mode = args.length > 0 ? args[0] : "all";

        if (sol.isPalindrome(121)) System.out.println("TEST_PASSED: sample-1");
        else System.err.println("TEST_FAILED: sample-1");

        if (!sol.isPalindrome(-121)) System.out.println("TEST_PASSED: sample-2");
        else System.err.println("TEST_FAILED: sample-2");

        if (!sol.isPalindrome(10)) System.out.println("TEST_PASSED: sample-3");
        else System.err.println("TEST_FAILED: sample-3");

        if ("sample".equals(mode)) return;

        if (sol.isPalindrome(0)) System.out.println("TEST_PASSED: hidden-1");
        else System.err.println("TEST_FAILED: hidden-1");

        if (sol.isPalindrome(1221)) System.out.println("TEST_PASSED: hidden-2");
        else System.err.println("TEST_FAILED: hidden-2");

        if (sol.isPalindrome(1234321)) System.out.println("TEST_PASSED: hidden-3");
        else System.err.println("TEST_FAILED: hidden-3");

        if (!sol.isPalindrome(1000021)) System.out.println("TEST_PASSED: hidden-4");
        else System.err.println("TEST_FAILED: hidden-4");
    }
}`,
    published: true,
  },

  // 3. String Character Frequency
  {
    slug: 'string-character-frequency',
    title: 'String Character Frequency',
    topic: 'CORE_JAVA',
    difficulty: 'EASY',
    orderIndex: 3,
    prompt: `Given a string \`s\` containing ASCII characters, return a formatted string summarizing the count of each character sorted alphabetically by the character.

Format: \`<char><count><char><count>...\`

### Example 1
- **Input:** \`s = "banana"\`
- **Output:** \`"a3b1n2"\`
- **Explanation:** 'a' appears 3 times, 'b' appears 1 time, 'n' appears 2 times.

### Example 2
- **Input:** \`s = "java"\`
- **Output:** \`"a2j1v1"\`

### Constraints
- \`0 <= s.length <= 10^5\`
- \`s\` consists of standard ASCII printable characters.`,
    starterCode: `class Solution {
    public String getFrequencyString(String s) {
        // Return characters and their counts in alphabetical order
        return "";
    }
}`,
    solutionCode: `import java.util.TreeMap;
import java.util.Map;

class Solution {
    public String getFrequencyString(String s) {
        if (s == null || s.isEmpty()) return "";
        Map<Character, Integer> counts = new TreeMap<>();
        for (char c : s.toCharArray()) {
            counts.put(c, counts.getOrDefault(c, 0) + 1);
        }
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<Character, Integer> entry : counts.entrySet()) {
            sb.append(entry.getKey()).append(entry.getValue());
        }
        return sb.toString();
    }
}`,
    sampleTests: [
      { id: 'sample-1', name: 'Sample 1: "banana"', input: '"banana"', expectedOutput: '"a3b1n2"' },
      { id: 'sample-2', name: 'Sample 2: "java"', input: '"java"', expectedOutput: '"a2j1v1"' },
    ],
    hiddenTests: [
      { id: 'hidden-1', name: 'Hidden 1: Empty string', input: '""', expectedOutput: '""' },
      { id: 'hidden-2', name: 'Hidden 2: "zzzz"', input: '"zzzz"', expectedOutput: '"z4"' },
      {
        id: 'hidden-3',
        name: 'Hidden 3: Mixed case "HelloWorld"',
        input: '"HelloWorld"',
        expectedOutput: '"H1W1d1e1l3o2r1"',
      },
    ],
    hints: [
      'A TreeMap sorts keys in their natural order automatically.',
      'Iterate through the string, update frequencies in your map, then append entries to a StringBuilder.',
      'Check for the empty string edge case: return an empty string immediately.',
    ],
    testHarness: `public class TestHarness {
    public static void main(String[] args) {
        Solution sol = new Solution();
        String mode = args.length > 0 ? args[0] : "all";

        if ("a3b1n2".equals(sol.getFrequencyString("banana"))) System.out.println("TEST_PASSED: sample-1");
        else System.err.println("TEST_FAILED: sample-1");

        if ("a2j1v1".equals(sol.getFrequencyString("java"))) System.out.println("TEST_PASSED: sample-2");
        else System.err.println("TEST_FAILED: sample-2");

        if ("sample".equals(mode)) return;

        if ("".equals(sol.getFrequencyString(""))) System.out.println("TEST_PASSED: hidden-1");
        else System.err.println("TEST_FAILED: hidden-1");

        if ("z4".equals(sol.getFrequencyString("zzzz"))) System.out.println("TEST_PASSED: hidden-2");
        else System.err.println("TEST_FAILED: hidden-2");

        if ("H1W1d1e1l3o2r1".equals(sol.getFrequencyString("HelloWorld"))) System.out.println("TEST_PASSED: hidden-3");
        else System.err.println("TEST_FAILED: hidden-3");
    }
}`,
    published: true,
  },

  // 4. Bank Account Encapsulation
  {
    slug: 'bank-account-encapsulation',
    title: 'Bank Account Encapsulation',
    topic: 'OOP',
    difficulty: 'EASY',
    orderIndex: 4,
    prompt: `Implement a \`BankAccount\` class that demonstrates strict object encapsulation.

### Requirements
- **Constructor:** \`public BankAccount(int initialBalance)\`
  - Throws \`IllegalArgumentException\` if \`initialBalance < 0\`.
- **Deposit:** \`public void deposit(int amount)\`
  - Adds funds to balance. Throws \`IllegalArgumentException\` if \`amount <= 0\`.
- **Withdraw:** \`public boolean withdraw(int amount)\`
  - Throws \`IllegalArgumentException\` if \`amount <= 0\`.
  - If \`amount <= balance\`, deducts amount and returns \`true\`.
  - If \`amount > balance\`, leaves balance unchanged and returns \`false\`.
- **Get Balance:** \`public int getBalance()\`
  - Returns the current balance in cents.`,
    starterCode: `class BankAccount {
    // Encapsulate private state here

    public BankAccount(int initialBalance) {
    }

    public void deposit(int amount) {
    }

    public boolean withdraw(int amount) {
        return false;
    }

    public int getBalance() {
        return 0;
    }
}`,
    solutionCode: `class BankAccount {
    private int balance;

    public BankAccount(int initialBalance) {
        if (initialBalance < 0) {
            throw new IllegalArgumentException("Initial balance cannot be negative");
        }
        this.balance = initialBalance;
    }

    public void deposit(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Deposit amount must be positive");
        }
        this.balance += amount;
    }

    public boolean withdraw(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be positive");
        }
        if (amount > this.balance) {
            return false;
        }
        this.balance -= amount;
        return true;
    }

    public int getBalance() {
        return this.balance;
    }
}`,
    sampleTests: [
      {
        id: 'sample-1',
        name: 'Sample 1: Deposit and getBalance',
        input: 'new BankAccount(100), deposit(50)',
        expectedOutput: '150',
      },
      {
        id: 'sample-2',
        name: 'Sample 2: Successful withdrawal',
        input: 'new BankAccount(100), withdraw(40)',
        expectedOutput: 'true, balance 60',
      },
    ],
    hiddenTests: [
      {
        id: 'hidden-1',
        name: 'Hidden 1: Insufficient funds withdrawal',
        input: 'new BankAccount(50), withdraw(60)',
        expectedOutput: 'false, balance 50',
      },
      {
        id: 'hidden-2',
        name: 'Hidden 2: Negative initial balance throws',
        input: 'new BankAccount(-10)',
        expectedOutput: 'IllegalArgumentException',
      },
      {
        id: 'hidden-3',
        name: 'Hidden 3: Zero or negative deposit throws',
        input: 'deposit(0) or deposit(-5)',
        expectedOutput: 'IllegalArgumentException',
      },
    ],
    hints: [
      'Keep balance private so it can only be modified through validated methods.',
      'Check input parameters at the beginning of each method before mutating state.',
      'Remember to throw IllegalArgumentException with a descriptive error message when inputs are invalid.',
    ],
    testHarness: `public class TestHarness {
    public static void main(String[] args) {
        String mode = args.length > 0 ? args[0] : "all";

        BankAccount acc = new BankAccount(100);
        acc.deposit(50);
        if (acc.getBalance() == 150) System.out.println("TEST_PASSED: sample-1");
        else System.err.println("TEST_FAILED: sample-1 Expected 150 got " + acc.getBalance());

        boolean ok = acc.withdraw(40);
        if (ok && acc.getBalance() == 110) System.out.println("TEST_PASSED: sample-2");
        else System.err.println("TEST_FAILED: sample-2 Expected true, balance 110");

        if ("sample".equals(mode)) return;

        boolean overdraw = acc.withdraw(200);
        if (!overdraw && acc.getBalance() == 110) System.out.println("TEST_PASSED: hidden-1");
        else System.err.println("TEST_FAILED: hidden-1 Expected false, balance unchanged");

        boolean threwNegInit = false;
        try {
            new BankAccount(-10);
        } catch (IllegalArgumentException e) {
            threwNegInit = true;
        }
        if (threwNegInit) System.out.println("TEST_PASSED: hidden-2");
        else System.err.println("TEST_FAILED: hidden-2 Negative initial balance did not throw");

        boolean threwBadDeposit = false;
        try {
            acc.deposit(0);
        } catch (IllegalArgumentException e) {
            threwBadDeposit = true;
        }
        if (threwBadDeposit) System.out.println("TEST_PASSED: hidden-3");
        else System.err.println("TEST_FAILED: hidden-3 Zero deposit did not throw");
    }
}`,
    published: true,
  },

  // 5. Shape Hierarchy Polymorphism
  {
    slug: 'shape-hierarchy-polymorphism',
    title: 'Shape Hierarchy Polymorphism',
    topic: 'OOP',
    difficulty: 'MEDIUM',
    orderIndex: 5,
    prompt: `Create a polymorphic shape hierarchy:

1. **Abstract Class \`Shape\`**:
   - \`public abstract double area();\`
   - \`public abstract double perimeter();\`

2. **Concrete Subclasses**:
   - \`Circle\`: Constructor \`Circle(double radius)\`. Area = \`pi * r^2\`, Perimeter = \`2 * pi * r\`.
   - \`Rectangle\`: Constructor \`Rectangle(double width, double height)\`. Area = \`w * h\`, Perimeter = \`2 * (w + h)\`.

3. **Utility Class \`ShapeCalculator\`**:
   - \`public static double totalArea(Shape[] shapes)\`: Returns sum of areas of all shapes in the array (0.0 if array is null or empty).`,
    starterCode: `abstract class Shape {
    public abstract double area();
    public abstract double perimeter();
}

class Circle extends Shape {
    public Circle(double radius) {}
    public double area() { return 0; }
    public double perimeter() { return 0; }
}

class Rectangle extends Shape {
    public Rectangle(double width, double height) {}
    public double area() { return 0; }
    public double perimeter() { return 0; }
}

class ShapeCalculator {
    public static double totalArea(Shape[] shapes) {
        return 0.0;
    }
}`,
    solutionCode: `abstract class Shape {
    public abstract double area();
    public abstract double perimeter();
}

class Circle extends Shape {
    private final double radius;
    public Circle(double radius) { this.radius = radius; }
    @Override public double area() { return Math.PI * radius * radius; }
    @Override public double perimeter() { return 2 * Math.PI * radius; }
}

class Rectangle extends Shape {
    private final double width;
    private final double height;
    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }
    @Override public double area() { return width * height; }
    @Override public double perimeter() { return 2 * (width + height); }
}

class ShapeCalculator {
    public static double totalArea(Shape[] shapes) {
        if (shapes == null) return 0.0;
        double sum = 0.0;
        for (Shape s : shapes) {
            if (s != null) sum += s.area();
        }
        return sum;
    }
}`,
    sampleTests: [
      {
        id: 'sample-1',
        name: 'Sample 1: Circle area & perimeter',
        input: 'Circle(5.0)',
        expectedOutput: 'area ~78.5398, perim ~31.4159',
      },
      {
        id: 'sample-2',
        name: 'Sample 2: Rectangle area & perimeter',
        input: 'Rectangle(4.0, 6.0)',
        expectedOutput: 'area 24.0, perim 20.0',
      },
    ],
    hiddenTests: [
      {
        id: 'hidden-1',
        name: 'Hidden 1: ShapeCalculator.totalArea mixed array',
        input: '[Circle(2), Rectangle(3,4)]',
        expectedOutput: '24.566',
      },
      {
        id: 'hidden-2',
        name: 'Hidden 2: Empty or null shapes array',
        input: 'null or empty array',
        expectedOutput: '0.0',
      },
    ],
    hints: [
      'Use Math.PI for precision in Circle calculation.',
      'Declare radius, width, and height as private final fields in the respective subclasses.',
      'totalArea iterates over the Shape array, taking advantage of dynamic method dispatch for each shape.area().',
    ],
    testHarness: `public class TestHarness {
    public static void main(String[] args) {
        String mode = args.length > 0 ? args[0] : "all";

        Circle c = new Circle(5.0);
        if (Math.abs(c.area() - (Math.PI * 25.0)) < 1e-4 && Math.abs(c.perimeter() - (10.0 * Math.PI)) < 1e-4) {
            System.out.println("TEST_PASSED: sample-1");
        } else {
            System.err.println("TEST_FAILED: sample-1");
        }

        Rectangle r = new Rectangle(4.0, 6.0);
        if (Math.abs(r.area() - 24.0) < 1e-4 && Math.abs(r.perimeter() - 20.0) < 1e-4) {
            System.out.println("TEST_PASSED: sample-2");
        } else {
            System.err.println("TEST_FAILED: sample-2");
        }

        if ("sample".equals(mode)) return;

        Shape[] list = new Shape[] { new Circle(2.0), new Rectangle(3.0, 4.0) };
        double expected = (Math.PI * 4.0) + 12.0;
        if (Math.abs(ShapeCalculator.totalArea(list) - expected) < 1e-4) {
            System.out.println("TEST_PASSED: hidden-1");
        } else {
            System.err.println("TEST_FAILED: hidden-1");
        }

        if (ShapeCalculator.totalArea(null) == 0.0 && ShapeCalculator.totalArea(new Shape[0]) == 0.0) {
            System.out.println("TEST_PASSED: hidden-2");
        } else {
            System.err.println("TEST_FAILED: hidden-2");
        }
    }
}`,
    published: true,
  },

  // 6. Immutable Student Record
  {
    slug: 'immutable-student-record',
    title: 'Immutable Student Record',
    topic: 'OOP',
    difficulty: 'MEDIUM',
    orderIndex: 6,
    prompt: `Implement an immutable \`Student\` class that protects its internal state from external tampering:

### Requirements
- **Fields:** \`id\` (int), \`name\` (String), \`courses\` (List<String>).
- **Constructor:** \`public Student(int id, String name, java.util.List<String> courses)\`
  - Throws \`IllegalArgumentException\` if \`id < 0\`, \`name\` is null/empty, or \`courses\` is null.
  - Perform defensive copying of the \`courses\` list!
- **Getters:**
  - \`public int getId()\`
  - \`public String getName()\`
  - \`public java.util.List<String> getCourses()\`
    - Returns an unmodifiable view of courses (e.g. \`Collections.unmodifiableList\`). Mutating the returned list must throw \`UnsupportedOperationException\`.`,
    starterCode: `import java.util.List;

class Student {
    // Implement immutable class here

    public Student(int id, String name, List<String> courses) {
    }

    public int getId() { return 0; }
    public String getName() { return ""; }
    public List<String> getCourses() { return null; }
}`,
    solutionCode: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

class Student {
    private final int id;
    private final String name;
    private final List<String> courses;

    public Student(int id, String name, List<String> courses) {
        if (id < 0) throw new IllegalArgumentException("Invalid ID");
        if (name == null || name.trim().isEmpty()) throw new IllegalArgumentException("Invalid name");
        if (courses == null) throw new IllegalArgumentException("Courses list cannot be null");
        this.id = id;
        this.name = name;
        this.courses = new ArrayList<>(courses); // Defensive copy
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public List<String> getCourses() {
        return Collections.unmodifiableList(courses);
    }
}`,
    sampleTests: [
      {
        id: 'sample-1',
        name: 'Sample 1: Creation and getters',
        input: 'Student(101, "Alice", ["CS101", "CS102"])',
        expectedOutput: 'id=101, name="Alice", courses=["CS101", "CS102"]',
      },
      {
        id: 'sample-2',
        name: 'Sample 2: Returned list is unmodifiable',
        input: 'student.getCourses().add("CS103")',
        expectedOutput: 'UnsupportedOperationException',
      },
    ],
    hiddenTests: [
      {
        id: 'hidden-1',
        name: 'Hidden 1: Modifying original list after construction does not mutate student',
        input: 'originalList.add("HACK")',
        expectedOutput: 'student.getCourses() unchanged',
      },
      {
        id: 'hidden-2',
        name: 'Hidden 2: Invalid constructor arguments throw',
        input: 'id < 0 or null name or null courses',
        expectedOutput: 'IllegalArgumentException',
      },
    ],
    hints: [
      'In the constructor, create a new ArrayList from the input courses to prevent the caller from modifying the list later.',
      'In getCourses(), return Collections.unmodifiableList(this.courses).',
      'Validate inputs at the start of the constructor before assigning fields.',
    ],
    testHarness: `import java.util.*;

public class TestHarness {
    public static void main(String[] args) {
        String mode = args.length > 0 ? args[0] : "all";

        List<String> list = new ArrayList<>(Arrays.asList("CS101", "CS102"));
        Student s = new Student(101, "Alice", list);

        if (s.getId() == 101 && "Alice".equals(s.getName()) && s.getCourses().size() == 2) {
            System.out.println("TEST_PASSED: sample-1");
        } else {
            System.err.println("TEST_FAILED: sample-1");
        }

        boolean threwUnmod = false;
        try {
            s.getCourses().add("CS999");
        } catch (UnsupportedOperationException e) {
            threwUnmod = true;
        }
        if (threwUnmod) System.out.println("TEST_PASSED: sample-2");
        else System.err.println("TEST_FAILED: sample-2 getCourses() list was mutable");

        if ("sample".equals(mode)) return;

        // Mutate original list
        list.add("INTRUDER");
        if (s.getCourses().size() == 2) {
            System.out.println("TEST_PASSED: hidden-1");
        } else {
            System.err.println("TEST_FAILED: hidden-1 Defensive copy failed: original mutation changed student");
        }

        boolean threwBad = false;
        try {
            new Student(-1, "Bob", list);
        } catch (IllegalArgumentException e) {
            threwBad = true;
        }
        if (threwBad) System.out.println("TEST_PASSED: hidden-2");
        else System.err.println("TEST_FAILED: hidden-2 Negative ID did not throw");
    }
}`,
    published: true,
  },

  // 7. Valid Parentheses Stack
  {
    slug: 'valid-parentheses-stack',
    title: 'Valid Parentheses Stack',
    topic: 'DSA',
    difficulty: 'EASY',
    orderIndex: 7,
    prompt: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Example 1
- **Input:** \`s = "()[]{}"\`
- **Output:** \`true\`

### Example 2
- **Input:** \`s = "(]"\`
- **Output:** \`false\`

### Constraints
- \`1 <= s.length <= 10^4\`
- \`s\` consists of parentheses only \`'()[]{}'.\``,
    starterCode: `class Solution {
    public boolean isValid(String s) {
        // Implement stack-based parenthesis checker
        return false;
    }
}`,
    solutionCode: `import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public boolean isValid(String s) {
        if (s == null || s.length() % 2 != 0) return false;
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else {
                if (stack.isEmpty() || stack.pop() != c) {
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }
}`,
    sampleTests: [
      { id: 'sample-1', name: 'Sample 1: "()[]{}"', input: '"()[]{}"', expectedOutput: 'true' },
      { id: 'sample-2', name: 'Sample 2: "(]"', input: '"(]"', expectedOutput: 'false' },
    ],
    hiddenTests: [
      { id: 'hidden-1', name: 'Hidden 1: "{[]}"', input: '"{[]}"', expectedOutput: 'true' },
      {
        id: 'hidden-2',
        name: 'Hidden 2: Single character "("',
        input: '"("',
        expectedOutput: 'false',
      },
      {
        id: 'hidden-3',
        name: 'Hidden 3: Closing first "]"',
        input: '"]"',
        expectedOutput: 'false',
      },
    ],
    hints: [
      'If string length is odd, it can never be valid.',
      'Use a Deque (ArrayDeque) as a stack. When seeing an opening bracket, push the expected closing bracket.',
      'When seeing a closing bracket, pop from stack and verify it matches.',
    ],
    testHarness: `public class TestHarness {
    public static void main(String[] args) {
        Solution sol = new Solution();
        String mode = args.length > 0 ? args[0] : "all";

        if (sol.isValid("()[]{}")) System.out.println("TEST_PASSED: sample-1");
        else System.err.println("TEST_FAILED: sample-1");

        if (!sol.isValid("(]")) System.out.println("TEST_PASSED: sample-2");
        else System.err.println("TEST_FAILED: sample-2");

        if ("sample".equals(mode)) return;

        if (sol.isValid("{[]}")) System.out.println("TEST_PASSED: hidden-1");
        else System.err.println("TEST_FAILED: hidden-1");

        if (!sol.isValid("(")) System.out.println("TEST_PASSED: hidden-2");
        else System.err.println("TEST_FAILED: hidden-2");

        if (!sol.isValid("]")) System.out.println("TEST_PASSED: hidden-3");
        else System.err.println("TEST_FAILED: hidden-3");
    }
}`,
    published: true,
  },

  // 8. Reverse Singly Linked List
  {
    slug: 'reverse-singly-linked-list',
    title: 'Reverse Singly Linked List',
    topic: 'DSA',
    difficulty: 'MEDIUM',
    orderIndex: 8,
    prompt: `Given the \`head\` of a singly linked list, reverse the list iteratively and return the reversed list's head.

Node definition:
\`\`\`java
class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}
\`\`\`

### Example 1
- **Input:** \`head = [1, 2, 3, 4, 5]\`
- **Output:** \`[5, 4, 3, 2, 1]\`

### Example 2
- **Input:** \`head = [1, 2]\`
- **Output:** \`[2, 1]\`

### Constraints
- Number of nodes is in range \`[0, 5000]\`.
- \`-5000 <= Node.val <= 5000\``,
    starterCode: `class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}

class Solution {
    public ListNode reverseList(ListNode head) {
        // Reverse linked list iteratively
        return null;
    }
}`,
    solutionCode: `class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}

class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}`,
    sampleTests: [
      {
        id: 'sample-1',
        name: 'Sample 1: [1,2,3,4,5]',
        input: '[1,2,3,4,5]',
        expectedOutput: '[5,4,3,2,1]',
      },
      { id: 'sample-2', name: 'Sample 2: [1,2]', input: '[1,2]', expectedOutput: '[2,1]' },
    ],
    hiddenTests: [
      { id: 'hidden-1', name: 'Hidden 1: Empty list []', input: 'null', expectedOutput: 'null' },
      { id: 'hidden-2', name: 'Hidden 2: Single node [42]', input: '[42]', expectedOutput: '[42]' },
    ],
    hints: [
      'Maintain three pointers: prev, curr, and next.',
      'Before updating curr.next = prev, save curr.next in a temporary variable so you do not lose the rest of the list.',
      'When curr becomes null, prev points to the new head.',
    ],
    testHarness: `public class TestHarness {
    public static void main(String[] args) {
        Solution sol = new Solution();
        String mode = args.length > 0 ? args[0] : "all";

        // Sample 1: 1 -> 2 -> 3
        ListNode n1 = new ListNode(1);
        n1.next = new ListNode(2);
        n1.next.next = new ListNode(3);
        ListNode rev = sol.reverseList(n1);
        if (rev != null && rev.val == 3 && rev.next.val == 2 && rev.next.next.val == 1) {
            System.out.println("TEST_PASSED: sample-1");
        } else {
            System.err.println("TEST_FAILED: sample-1");
        }

        // Sample 2: 1 -> 2
        ListNode n2 = new ListNode(1);
        n2.next = new ListNode(2);
        ListNode rev2 = sol.reverseList(n2);
        if (rev2 != null && rev2.val == 2 && rev2.next.val == 1) {
            System.out.println("TEST_PASSED: sample-2");
        } else {
            System.err.println("TEST_FAILED: sample-2");
        }

        if ("sample".equals(mode)) return;

        if (sol.reverseList(null) == null) {
            System.out.println("TEST_PASSED: hidden-1");
        } else {
            System.err.println("TEST_FAILED: hidden-1");
        }

        ListNode single = new ListNode(42);
        ListNode revSingle = sol.reverseList(single);
        if (revSingle != null && revSingle.val == 42 && revSingle.next == null) {
            System.out.println("TEST_PASSED: hidden-2");
        } else {
            System.err.println("TEST_FAILED: hidden-2");
        }
    }
}`,
    published: true,
  },

  // 9. Binary Search Insert
  {
    slug: 'binary-search-insert',
    title: 'Binary Search Insert Position',
    topic: 'DSA',
    difficulty: 'MEDIUM',
    orderIndex: 9,
    prompt: `Given a sorted array of distinct integers \`nums\` and a target value \`target\`, return the index if the target is found. If not, return the index where it would be if it were inserted in order.

You must write an algorithm with \`O(log n)\` runtime complexity.

### Example 1
- **Input:** \`nums = [1, 3, 5, 6], target = 5\`
- **Output:** \`2\`

### Example 2
- **Input:** \`nums = [1, 3, 5, 6], target = 2\`
- **Output:** \`1\`

### Example 3
- **Input:** \`nums = [1, 3, 5, 6], target = 7\`
- **Output:** \`4\`

### Constraints
- \`1 <= nums.length <= 10^4\`
- \`-10^4 <= nums[i] <= 10^4\`
- \`nums\` contains distinct values sorted in ascending order.`,
    starterCode: `class Solution {
    public int searchInsert(int[] nums, int target) {
        // Implement O(log n) binary search
        return 0;
    }
}`,
    solutionCode: `class Solution {
    public int searchInsert(int[] nums, int target) {
        int low = 0;
        int high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return low;
    }
}`,
    sampleTests: [
      {
        id: 'sample-1',
        name: 'Sample 1: nums=[1,3,5,6], target=5',
        input: '[1,3,5,6], 5',
        expectedOutput: '2',
      },
      {
        id: 'sample-2',
        name: 'Sample 2: nums=[1,3,5,6], target=2',
        input: '[1,3,5,6], 2',
        expectedOutput: '1',
      },
      {
        id: 'sample-3',
        name: 'Sample 3: nums=[1,3,5,6], target=7',
        input: '[1,3,5,6], 7',
        expectedOutput: '4',
      },
    ],
    hiddenTests: [
      {
        id: 'hidden-1',
        name: 'Hidden 1: nums=[1,3,5,6], target=0',
        input: '[1,3,5,6], 0',
        expectedOutput: '0',
      },
      {
        id: 'hidden-2',
        name: 'Hidden 2: Single element nums=[1], target=0',
        input: '[1], 0',
        expectedOutput: '0',
      },
      {
        id: 'hidden-3',
        name: 'Hidden 3: Single element nums=[1], target=2',
        input: '[1], 2',
        expectedOutput: '1',
      },
    ],
    hints: [
      'Initialize low = 0 and high = nums.length - 1.',
      'Compute mid = low + (high - low) / 2 to avoid integer overflow.',
      'When low > high, low holds the exact insertion index.',
    ],
    testHarness: `public class TestHarness {
    public static void main(String[] args) {
        Solution sol = new Solution();
        String mode = args.length > 0 ? args[0] : "all";

        int[] nums = new int[]{1, 3, 5, 6};
        if (sol.searchInsert(nums, 5) == 2) System.out.println("TEST_PASSED: sample-1");
        else System.err.println("TEST_FAILED: sample-1");

        if (sol.searchInsert(nums, 2) == 1) System.out.println("TEST_PASSED: sample-2");
        else System.err.println("TEST_FAILED: sample-2");

        if (sol.searchInsert(nums, 7) == 4) System.out.println("TEST_PASSED: sample-3");
        else System.err.println("TEST_FAILED: sample-3");

        if ("sample".equals(mode)) return;

        if (sol.searchInsert(nums, 0) == 0) System.out.println("TEST_PASSED: hidden-1");
        else System.err.println("TEST_FAILED: hidden-1");

        if (sol.searchInsert(new int[]{1}, 0) == 0) System.out.println("TEST_PASSED: hidden-2");
        else System.err.println("TEST_FAILED: hidden-2");

        if (sol.searchInsert(new int[]{1}, 2) == 1) System.out.println("TEST_PASSED: hidden-3");
        else System.err.println("TEST_FAILED: hidden-3");
    }
}`,
    published: true,
  },

  // 10. Stream Filter Transform
  {
    slug: 'stream-filter-transform',
    title: 'Stream Filter Transform',
    topic: 'ADVANCED_JAVA',
    difficulty: 'MEDIUM',
    orderIndex: 10,
    prompt: `Implement a method using Java Streams:

\`\`\`java
public static java.util.List<Integer> processNumbers(java.util.List<Integer> numbers)
\`\`\`

### Operations
1. Discard any null inputs (return empty list if \`numbers\` is null).
2. Filter out all odd numbers (keep only even numbers: \`n % 2 == 0\`).
3. Square each number (\`n * n\`).
4. Sort the squares in **descending** order.
5. Return the result as an unmodifiable list (\`Collections.unmodifiableList\` or \`toList()\`).

### Example
- **Input:** \`[1, 2, 3, 4, 5, 6]\`
- **Even numbers:** \`[2, 4, 6]\`
- **Squares:** \`[4, 16, 36]\`
- **Output:** \`[36, 16, 4]\``,
    starterCode: `import java.util.List;

class Solution {
    public static List<Integer> processNumbers(List<Integer> numbers) {
        // Implement with Java Stream API
        return List.of();
    }
}`,
    solutionCode: `import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

class Solution {
    public static List<Integer> processNumbers(List<Integer> numbers) {
        if (numbers == null) return List.of();
        return numbers.stream()
            .filter(n -> n != null && n % 2 == 0)
            .map(n -> n * n)
            .sorted(Comparator.reverseOrder())
            .toList();
    }
}`,
    sampleTests: [
      {
        id: 'sample-1',
        name: 'Sample 1: [1, 2, 3, 4, 5, 6]',
        input: '[1,2,3,4,5,6]',
        expectedOutput: '[36, 16, 4]',
      },
      {
        id: 'sample-2',
        name: 'Sample 2: Null or empty input',
        input: 'null',
        expectedOutput: '[]',
      },
    ],
    hiddenTests: [
      {
        id: 'hidden-1',
        name: 'Hidden 1: All odd numbers [1, 3, 5, 7]',
        input: '[1,3,5,7]',
        expectedOutput: '[]',
      },
      {
        id: 'hidden-2',
        name: 'Hidden 2: Negative even numbers [-2, -4, 2]',
        input: '[-2,-4,2]',
        expectedOutput: '[16, 4, 4]',
      },
    ],
    hints: [
      'Remember to filter out null elements if the list contains them.',
      'Use .sorted(Comparator.reverseOrder()) to sort in descending order.',
      '.toList() produces an unmodifiable List in Java 16+.',
    ],
    testHarness: `import java.util.List;

public class TestHarness {
    public static void main(String[] args) {
        String mode = args.length > 0 ? args[0] : "all";

        List<Integer> r1 = Solution.processNumbers(List.of(1, 2, 3, 4, 5, 6));
        if (r1.equals(List.of(36, 16, 4))) System.out.println("TEST_PASSED: sample-1");
        else System.err.println("TEST_FAILED: sample-1 got " + r1);

        List<Integer> r2 = Solution.processNumbers(null);
        if (r2.isEmpty()) System.out.println("TEST_PASSED: sample-2");
        else System.err.println("TEST_FAILED: sample-2");

        if ("sample".equals(mode)) return;

        List<Integer> r3 = Solution.processNumbers(List.of(1, 3, 5, 7));
        if (r3.isEmpty()) System.out.println("TEST_PASSED: hidden-1");
        else System.err.println("TEST_FAILED: hidden-1");

        List<Integer> r4 = Solution.processNumbers(List.of(-2, -4, 2));
        if (r4.equals(List.of(16, 4, 4))) System.out.println("TEST_PASSED: hidden-2");
        else System.err.println("TEST_FAILED: hidden-2 got " + r4);
    }
}`,
    published: true,
  },

  // 11. Generic Box Container
  {
    slug: 'generic-box-container',
    title: 'Generic Box Container',
    topic: 'ADVANCED_JAVA',
    difficulty: 'MEDIUM',
    orderIndex: 11,
    prompt: `Implement a generic container class \`Box<T>\`:

### Requirements
- \`public Box()\` (creates empty box)
- \`public Box(T item)\` (creates box with item)
- \`public void set(T item)\`
- \`public T get()\` (returns item or null)
- \`public boolean isEmpty()\`
- \`public <R> Box<R> map(java.util.function.Function<T, R> mapper)\`
  - If box is empty, returns an empty \`Box<R>\`.
  - Otherwise, applies \`mapper.apply(item)\` and returns a \`Box<R>\` with the result.`,
    starterCode: `import java.util.function.Function;

class Box<T> {
    // Implement generic Box methods
    public Box() {}
    public Box(T item) {}
    public void set(T item) {}
    public T get() { return null; }
    public boolean isEmpty() { return true; }
    public <R> Box<R> map(Function<T, R> mapper) { return null; }
}`,
    solutionCode: `import java.util.function.Function;

class Box<T> {
    private T item;

    public Box() {
        this.item = null;
    }

    public Box(T item) {
        this.item = item;
    }

    public void set(T item) {
        this.item = item;
    }

    public T get() {
        return this.item;
    }

    public boolean isEmpty() {
        return this.item == null;
    }

    public <R> Box<R> map(Function<T, R> mapper) {
        if (isEmpty()) {
            return new Box<>();
        }
        return new Box<>(mapper.apply(this.item));
    }
}`,
    sampleTests: [
      {
        id: 'sample-1',
        name: 'Sample 1: Box with String and get',
        input: 'Box<String>("hello")',
        expectedOutput: 'get() == "hello", isEmpty() == false',
      },
      {
        id: 'sample-2',
        name: 'Sample 2: Box.map transformation',
        input: 'Box<Integer>(5).map(x -> x * 2)',
        expectedOutput: 'Box<Integer> with 10',
      },
    ],
    hiddenTests: [
      {
        id: 'hidden-1',
        name: 'Hidden 1: Mapping empty box returns empty box',
        input: 'Box<String>().map(String::length)',
        expectedOutput: 'isEmpty() == true',
      },
      {
        id: 'hidden-2',
        name: 'Hidden 2: Type conversion String to Integer',
        input: 'Box<String>("123").map(Integer::parseInt)',
        expectedOutput: 'Box with 123',
      },
    ],
    hints: [
      'Store private T item.',
      'In map, check isEmpty() before applying the function.',
      'The type parameter <R> on map makes the method polymorphic independently of T.',
    ],
    testHarness: `public class TestHarness {
    public static void main(String[] args) {
        String mode = args.length > 0 ? args[0] : "all";

        Box<String> b1 = new Box<>("hello");
        if ("hello".equals(b1.get()) && !b1.isEmpty()) System.out.println("TEST_PASSED: sample-1");
        else System.err.println("TEST_FAILED: sample-1");

        Box<Integer> b2 = new Box<>(5);
        Box<Integer> mapped = b2.map(x -> x * 2);
        if (mapped.get() == 10) System.out.println("TEST_PASSED: sample-2");
        else System.err.println("TEST_FAILED: sample-2");

        if ("sample".equals(mode)) return;

        Box<String> empty = new Box<>();
        Box<Integer> mappedEmpty = empty.map(String::length);
        if (mappedEmpty.isEmpty()) System.out.println("TEST_PASSED: hidden-1");
        else System.err.println("TEST_FAILED: hidden-1");

        Box<String> numStr = new Box<>("123");
        Box<Integer> parsed = numStr.map(Integer::parseInt);
        if (parsed.get() == 123) System.out.println("TEST_PASSED: hidden-2");
        else System.err.println("TEST_FAILED: hidden-2");
    }
}`,
    published: true,
  },

  // 12. Thread Safe Counter
  {
    slug: 'thread-safe-counter',
    title: 'Thread Safe Counter',
    topic: 'ADVANCED_JAVA',
    difficulty: 'HARD',
    orderIndex: 12,
    prompt: `Implement a thread-safe \`ThreadSafeCounter\` class that operates safely under concurrent multi-threaded execution:

### Methods
- \`public void increment()\`: Adds 1.
- \`public void decrement()\`: Subtracts 1.
- \`public void add(int delta)\`: Adds \`delta\`.
- \`public int getValue()\`: Returns the current counter value.

All operations must be atomic and free of race conditions without deadlock.`,
    starterCode: `class ThreadSafeCounter {
    // Implement thread-safe counter
    public void increment() {}
    public void decrement() {}
    public void add(int delta) {}
    public int getValue() { return 0; }
}`,
    solutionCode: `import java.util.concurrent.atomic.AtomicInteger;

class ThreadSafeCounter {
    private final AtomicInteger count = new AtomicInteger(0);

    public void increment() {
        count.incrementAndGet();
    }

    public void decrement() {
        count.decrementAndGet();
    }

    public void add(int delta) {
        count.addAndGet(delta);
    }

    public int getValue() {
        return count.get();
    }
}`,
    sampleTests: [
      {
        id: 'sample-1',
        name: 'Sample 1: Basic increment and decrement',
        input: 'increment() twice, decrement() once',
        expectedOutput: '1',
      },
      { id: 'sample-2', name: 'Sample 2: add(delta)', input: 'add(10)', expectedOutput: '10' },
    ],
    hiddenTests: [
      {
        id: 'hidden-1',
        name: 'Hidden 1: Concurrent increment from 10 threads',
        input: '10 threads x 1000 increments',
        expectedOutput: '10000',
      },
      {
        id: 'hidden-2',
        name: 'Hidden 2: Mixed concurrent add and decrement',
        input: '5 threads adding 10, 5 threads subtracting 10',
        expectedOutput: '0',
      },
    ],
    hints: [
      'Consider java.util.concurrent.atomic.AtomicInteger which provides lock-free thread-safe operations.',
      'Alternatively, use synchronized methods or ReentrantLock.',
      'AtomicInteger.incrementAndGet(), decrementAndGet(), and addAndGet() are atomic machine instructions.',
    ],
    testHarness: `public class TestHarness {
    public static void main(String[] args) throws Exception {
        String mode = args.length > 0 ? args[0] : "all";

        ThreadSafeCounter c = new ThreadSafeCounter();
        c.increment();
        c.increment();
        c.decrement();
        if (c.getValue() == 1) System.out.println("TEST_PASSED: sample-1");
        else System.err.println("TEST_FAILED: sample-1");

        c.add(10);
        if (c.getValue() == 11) System.out.println("TEST_PASSED: sample-2");
        else System.err.println("TEST_FAILED: sample-2");

        if ("sample".equals(mode)) return;

        // Concurrent test
        ThreadSafeCounter concurrentCounter = new ThreadSafeCounter();
        Thread[] threads = new Thread[10];
        for (int i = 0; i < 10; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 1000; j++) {
                    concurrentCounter.increment();
                }
            });
            threads[i].start();
        }
        for (Thread t : threads) t.join();
        if (concurrentCounter.getValue() == 10000) System.out.println("TEST_PASSED: hidden-1");
        else System.err.println("TEST_FAILED: hidden-1 Expected 10000 got " + concurrentCounter.getValue());

        // Mixed concurrent
        ThreadSafeCounter mixed = new ThreadSafeCounter();
        Thread[] mixedThreads = new Thread[10];
        for (int i = 0; i < 5; i++) {
            mixedThreads[i] = new Thread(() -> {
                for (int j = 0; j < 500; j++) mixed.add(10);
            });
            mixedThreads[i + 5] = new Thread(() -> {
                for (int j = 0; j < 500; j++) mixed.add(-10);
            });
        }
        for (Thread t : mixedThreads) t.start();
        for (Thread t : mixedThreads) t.join();
        if (mixed.getValue() == 0) System.out.println("TEST_PASSED: hidden-2");
        else System.err.println("TEST_FAILED: hidden-2 Expected 0 got " + mixed.getValue());
    }
}`,
    published: true,
  },
];
