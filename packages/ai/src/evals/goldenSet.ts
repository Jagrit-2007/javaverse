import type { GoldenCase } from '@javaverse/schemas';

export const GOLDEN_EVAL_SET: GoldenCase[] = [
  // ==========================================
  // CORE JAVA (15 Cases)
  // ==========================================
  {
    id: 'golden-core-01',
    title: 'String In-Place Palindrome Check',
    category: 'CORE_JAVA',
    prompt:
      'Implement a method `isPalindrome(String s)` ignoring case and non-alphanumeric characters without extra memory.',
    expectedConcepts: [
      'two pointers',
      'Character.isLetterOrDigit',
      'Character.toLowerCase',
      'constant space',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        if (!Solution.isPalindrome("A man, a plan, a canal: Panama")) throw new RuntimeException("Fail 1");
        if (Solution.isPalindrome("race a car")) throw new RuntimeException("Fail 2");
        if (!Solution.isPalindrome(" ")) throw new RuntimeException("Fail 3");
        if (!Solution.isPalindrome("0P0")) throw new RuntimeException("Fail 4");
        if (Solution.isPalindrome("0P")) throw new RuntimeException("Fail 5");
        if (!Solution.isPalindrome("a.")) throw new RuntimeException("Fail 6");
        if (!Solution.isPalindrome("")) throw new RuntimeException("Fail 7");
        if (!Solution.isPalindrome("ab_a")) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) return false;
            left++;
            right--;
        }
        return true;
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(1)' },
    expectedVisualizer: 'array',
  },
  {
    id: 'golden-core-02',
    title: 'Second Largest Element in Array',
    category: 'CORE_JAVA',
    prompt:
      'Find the second distinct largest element in an int array in a single O(n) pass without sorting.',
    expectedConcepts: [
      'single pass',
      'Integer.MIN_VALUE',
      'distinct values',
      'O(1) auxiliary space',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        if (Solution.findSecondLargest(new int[]{12, 35, 1, 10, 34, 1}) != 34) throw new RuntimeException("Fail 1");
        if (Solution.findSecondLargest(new int[]{10, 5, 10}) != 5) throw new RuntimeException("Fail 2");
        if (Solution.findSecondLargest(new int[]{10, 10, 10}) != -1) throw new RuntimeException("Fail 3");
        if (Solution.findSecondLargest(new int[]{5}) != -1) throw new RuntimeException("Fail 4");
        if (Solution.findSecondLargest(new int[]{-5, -2, -10, -1}) != -2) throw new RuntimeException("Fail 5");
        if (Solution.findSecondLargest(new int[]{1, 2}) != 1) throw new RuntimeException("Fail 6");
        if (Solution.findSecondLargest(new int[]{2, 1}) != 1) throw new RuntimeException("Fail 7");
        if (Solution.findSecondLargest(new int[]{}) != -1) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static int findSecondLargest(int[] arr) {
        if (arr == null || arr.length < 2) return -1;
        int max = Integer.MIN_VALUE, second = Integer.MIN_VALUE;
        boolean foundFirst = false, foundSecond = false;
        for (int v : arr) {
            if (!foundFirst || v > max) {
                if (foundFirst) { second = max; foundSecond = true; }
                max = v;
                foundFirst = true;
            } else if (v < max && (!foundSecond || v > second)) {
                second = v;
                foundSecond = true;
            }
        }
        return foundSecond ? second : -1;
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(1)' },
    expectedVisualizer: 'array',
  },
  {
    id: 'golden-core-03',
    title: 'Wrapper Caching and Object Identity',
    category: 'CORE_JAVA',
    prompt: 'Demonstrate Integer caching in the range -128 to 127 vs new instance allocation.',
    expectedConcepts: ['IntegerCache', 'identity comparison ==', 'equals() method', 'autoboxing'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        if (!Solution.isCached(127)) throw new RuntimeException("Fail 1");
        if (!Solution.isCached(-128)) throw new RuntimeException("Fail 2");
        if (!Solution.isCached(0)) throw new RuntimeException("Fail 3");
        if (Solution.isCached(128)) throw new RuntimeException("Fail 4");
        if (Solution.isCached(-129)) throw new RuntimeException("Fail 5");
        if (!Solution.equalsValue(1000, 1000)) throw new RuntimeException("Fail 6");
        if (Solution.sameIdentity(1000, 1000)) throw new RuntimeException("Fail 7");
        if (!Solution.sameIdentity(100, 100)) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static boolean isCached(int val) {
        Integer a = val;
        Integer b = val;
        return a == b;
    }
    public static boolean equalsValue(int val1, int val2) {
        Integer a = Integer.valueOf(val1);
        Integer b = Integer.valueOf(val2);
        return a.equals(b);
    }
    public static boolean sameIdentity(int val1, int val2) {
        Integer a = Integer.valueOf(val1);
        Integer b = Integer.valueOf(val2);
        return a == b;
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-core-04',
    title: 'Custom Exception Hierarchy with Chained Causes',
    category: 'CORE_JAVA',
    prompt:
      'Create a custom checked exception `ServiceException` with an underlying root cause and error code.',
    expectedConcepts: ['Throwable cause', 'initCause', 'getCause', 'super(message, cause)'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        try {
            Solution.riskyOperation(-1);
            throw new RuntimeException("Fail 1");
        } catch (ServiceException e) {
            if (!"ERR_INVALID_INPUT".equals(e.getErrorCode())) throw new RuntimeException("Fail 2");
            if (!(e.getCause() instanceof IllegalArgumentException)) throw new RuntimeException("Fail 3");
        }
        try {
            Solution.riskyOperation(0);
            throw new RuntimeException("Fail 4");
        } catch (ServiceException e) {
            if (!"ERR_TIMEOUT".equals(e.getErrorCode())) throw new RuntimeException("Fail 5");
        }
        int res = Solution.riskyOperation(42);
        if (res != 84) throw new RuntimeException("Fail 6");
        ServiceException ex = new ServiceException("CODE", "msg", new Exception("root"));
        if (!"CODE".equals(ex.getErrorCode())) throw new RuntimeException("Fail 7");
        if (!"root".equals(ex.getCause().getMessage())) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class ServiceException extends Exception {
    private final String errorCode;
    public ServiceException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
    public String getErrorCode() { return errorCode; }
}
class Solution {
    public static int riskyOperation(int input) throws ServiceException {
        if (input < 0) {
            throw new ServiceException("ERR_INVALID_INPUT", "Negative", new IllegalArgumentException("Negative: " + input));
        }
        if (input == 0) {
            throw new ServiceException("ERR_TIMEOUT", "Zero value", new IllegalStateException("Timeout"));
        }
        return input * 2;
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-core-05',
    title: 'In-Place Square Matrix Transposition',
    category: 'CORE_JAVA',
    prompt: 'Transpose an N x N 2D array in-place without creating a secondary matrix.',
    expectedConcepts: ['in-place swap', 'upper triangle traversal', 'matrix[i][j]', 'matrix[j][i]'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        int[][] m = {{1, 2}, {3, 4}};
        Solution.transpose(m);
        if (m[0][1] != 3 || m[1][0] != 2) throw new RuntimeException("Fail 1");
        int[][] m3 = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
        Solution.transpose(m3);
        if (m3[0][1] != 4 || m3[1][0] != 2 || m3[2][1] != 6) throw new RuntimeException("Fail 2");
        int[][] m1 = {{42}};
        Solution.transpose(m1);
        if (m1[0][0] != 42) throw new RuntimeException("Fail 3");
        int[][] mEmpty = {};
        Solution.transpose(mEmpty);
        if (mEmpty.length != 0) throw new RuntimeException("Fail 4");
        int[][] m4 = {{1,2,3,4},{5,6,7,8},{9,10,11,12},{13,14,15,16}};
        Solution.transpose(m4);
        if (m4[0][3] != 13 || m4[3][0] != 4) throw new RuntimeException("Fail 5");
        if (m4[1][2] != 11 || m4[2][1] != 7) throw new RuntimeException("Fail 6");
        if (m4[0][0] != 1 || m4[3][3] != 16) throw new RuntimeException("Fail 7");
        Solution.transpose(m4);
        if (m4[0][3] != 4 || m4[3][0] != 13) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static void transpose(int[][] matrix) {
        if (matrix == null || matrix.length <= 1) return;
        int n = matrix.length;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int temp = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = temp;
            }
        }
    }
}
`,
    expectedBigO: { time: 'O(n^2)', space: 'O(1)' },
    expectedVisualizer: 'array',
  },
  {
    id: 'golden-core-06',
    title: 'Enum State Machine with Abstract Methods',
    category: 'CORE_JAVA',
    prompt:
      'Implement an OrderStatus enum state machine where each state defines transition rules.',
    expectedConcepts: [
      'enum abstract method',
      'state transitions',
      'IllegalStateException',
      'constant-specific class body',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        OrderStatus s = OrderStatus.PENDING;
        s = s.next();
        if (s != OrderStatus.PAID) throw new RuntimeException("Fail 1");
        s = s.next();
        if (s != OrderStatus.SHIPPED) throw new RuntimeException("Fail 2");
        s = s.next();
        if (s != OrderStatus.DELIVERED) throw new RuntimeException("Fail 3");
        try {
            s.next();
            throw new RuntimeException("Fail 4");
        } catch (IllegalStateException e) {}
        if (!OrderStatus.PENDING.canCancel()) throw new RuntimeException("Fail 5");
        if (!OrderStatus.PAID.canCancel()) throw new RuntimeException("Fail 6");
        if (OrderStatus.SHIPPED.canCancel()) throw new RuntimeException("Fail 7");
        if (OrderStatus.DELIVERED.canCancel()) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
enum OrderStatus {
    PENDING {
        public OrderStatus next() { return PAID; }
        public boolean canCancel() { return true; }
    },
    PAID {
        public OrderStatus next() { return SHIPPED; }
        public boolean canCancel() { return true; }
    },
    SHIPPED {
        public OrderStatus next() { return DELIVERED; }
        public boolean canCancel() { return false; }
    },
    DELIVERED {
        public OrderStatus next() { throw new IllegalStateException("Delivered"); }
        public boolean canCancel() { return false; }
    };
    public abstract OrderStatus next();
    public abstract boolean canCancel();
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'graph',
  },
  {
    id: 'golden-core-07',
    title: 'Bitwise Power of Two and Hamming Weight',
    category: 'CORE_JAVA',
    prompt:
      'Determine whether n is a power of two and compute the number of set bits (Brian Kernighan algorithm).',
    expectedConcepts: ['(n & (n - 1))', 'bit manipulation', 'Kernighan algorithm', 'O(1) time'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        if (!Solution.isPowerOfTwo(1)) throw new RuntimeException("Fail 1");
        if (!Solution.isPowerOfTwo(16)) throw new RuntimeException("Fail 2");
        if (Solution.isPowerOfTwo(14)) throw new RuntimeException("Fail 3");
        if (Solution.isPowerOfTwo(0)) throw new RuntimeException("Fail 4");
        if (Solution.isPowerOfTwo(-16)) throw new RuntimeException("Fail 5");
        if (Solution.countSetBits(15) != 4) throw new RuntimeException("Fail 6");
        if (Solution.countSetBits(0) != 0) throw new RuntimeException("Fail 7");
        if (Solution.countSetBits(1024) != 1) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static boolean isPowerOfTwo(int n) {
        return n > 0 && (n & (n - 1)) == 0;
    }
    public static int countSetBits(int n) {
        int count = 0;
        while (n != 0) {
            n &= (n - 1);
            count++;
        }
        return count;
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'array',
  },
  {
    id: 'golden-core-08',
    title: 'Compact Canonical Constructor Validation in Java Records',
    category: 'CORE_JAVA',
    prompt: 'Implement a Java record `UserAccount` with compact canonical constructor invariants.',
    expectedConcepts: [
      'record component',
      'compact constructor',
      'IllegalArgumentException',
      'Objects.requireNonNull',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        UserAccount acc = new UserAccount("john", "john@example.com", 25);
        if (!"john".equals(acc.username())) throw new RuntimeException("Fail 1");
        if (!"john@example.com".equals(acc.email())) throw new RuntimeException("Fail 2");
        if (acc.age() != 25) throw new RuntimeException("Fail 3");
        try {
            new UserAccount("", "email@test.com", 20);
            throw new RuntimeException("Fail 4");
        } catch (IllegalArgumentException e) {}
        try {
            new UserAccount("name", "bademail", 20);
            throw new RuntimeException("Fail 5");
        } catch (IllegalArgumentException e) {}
        try {
            new UserAccount("name", "email@test.com", 12);
            throw new RuntimeException("Fail 6");
        } catch (IllegalArgumentException e) {}
        UserAccount acc2 = new UserAccount("john", "john@example.com", 25);
        if (!acc.equals(acc2)) throw new RuntimeException("Fail 7");
        if (acc.hashCode() != acc2.hashCode()) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
record UserAccount(String username, String email, int age) {
    public UserAccount {
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("Username required");
        }
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email");
        }
        if (age < 13) {
            throw new IllegalArgumentException("Minimum age is 13");
        }
        username = username.trim();
        email = email.trim().toLowerCase();
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-core-09',
    title: 'Pattern Matching for Switch with Sealed Hierarchies',
    category: 'CORE_JAVA',
    prompt:
      'Implement a calculation dispatcher using pattern matching for switch over sealed shapes.',
    expectedConcepts: [
      'sealed interface',
      'permits',
      'pattern matching switch',
      'exhaustive pattern',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        Shape c = new Circle(10);
        Shape r = new Rect(4, 5);
        Shape t = new Triangle(6, 4);
        if (Math.abs(Solution.calcArea(c) - 314.159) > 0.01) throw new RuntimeException("Fail 1");
        if (Math.abs(Solution.calcArea(r) - 20.0) > 0.001) throw new RuntimeException("Fail 2");
        if (Math.abs(Solution.calcArea(t) - 12.0) > 0.001) throw new RuntimeException("Fail 3");
        if (!"Circle: 10.0".equals(Solution.describe(c))) throw new RuntimeException("Fail 4");
        if (!"Rect: 4.0x5.0".equals(Solution.describe(r))) throw new RuntimeException("Fail 5");
        if (!"Triangle: b=6.0, h=4.0".equals(Solution.describe(t))) throw new RuntimeException("Fail 6");
        if (Solution.calcArea(new Circle(0)) != 0.0) throw new RuntimeException("Fail 7");
        if (Solution.calcArea(new Rect(0, 10)) != 0.0) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
sealed interface Shape permits Circle, Rect, Triangle {}
record Circle(double radius) implements Shape {}
record Rect(double width, double height) implements Shape {}
record Triangle(double base, double height) implements Shape {}

class Solution {
    public static double calcArea(Shape s) {
        return switch (s) {
            case Circle c -> Math.PI * c.radius() * c.radius();
            case Rect r -> r.width() * r.height();
            case Triangle t -> 0.5 * t.base() * t.height();
        };
    }
    public static String describe(Shape s) {
        return switch (s) {
            case Circle c -> "Circle: " + c.radius();
            case Rect r -> "Rect: " + r.width() + "x" + r.height();
            case Triangle t -> "Triangle: b=" + t.base() + ", h=" + t.height();
        };
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-core-10',
    title: 'Java 21 Sequenced Collections Operations',
    category: 'CORE_JAVA',
    prompt: 'Use SequencedCollection and SequencedSet to maintain an ordered sequence.',
    expectedConcepts: ['SequencedCollection', 'addFirst', 'addLast', 'reversed()'],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        SequencedCollection<String> list = new ArrayList<>();
        list.addLast("B");
        list.addFirst("A");
        list.addLast("C");
        if (!"A".equals(list.getFirst())) throw new RuntimeException("Fail 1");
        if (!"C".equals(list.getLast())) throw new RuntimeException("Fail 2");
        List<String> rev = list.reversed().stream().toList();
        if (!"C".equals(rev.get(0))) throw new RuntimeException("Fail 3");
        if (!"B".equals(rev.get(1))) throw new RuntimeException("Fail 4");
        if (!"A".equals(rev.get(2))) throw new RuntimeException("Fail 5");
        String removed = list.removeFirst();
        if (!"A".equals(removed)) throw new RuntimeException("Fail 6");
        if (!"B".equals(list.getFirst())) throw new RuntimeException("Fail 7");
        if (list.size() != 2) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(n)' },
    expectedVisualizer: 'stack_queue',
  },
  {
    id: 'golden-core-11',
    title: 'Efficient String Building in Loops',
    category: 'CORE_JAVA',
    prompt:
      'Build a formatted string of numbers from 1 to N separated by commas using StringBuilder with initial capacity.',
    expectedConcepts: [
      'StringBuilder',
      'initial capacity',
      'avoid String concatenation in loop',
      'O(n) time',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        if (!"1".equals(Solution.joinNumbers(1))) throw new RuntimeException("Fail 1");
        if (!"1, 2, 3".equals(Solution.joinNumbers(3))) throw new RuntimeException("Fail 2");
        if (!"".equals(Solution.joinNumbers(0))) throw new RuntimeException("Fail 3");
        if (!"".equals(Solution.joinNumbers(-5))) throw new RuntimeException("Fail 4");
        String s10 = Solution.joinNumbers(10);
        if (!s10.startsWith("1, 2, 3") || !s10.endsWith(", 10")) throw new RuntimeException("Fail 5");
        String[] parts = s10.split(", ");
        if (parts.length != 10) throw new RuntimeException("Fail 6");
        if (!"1".equals(parts[0])) throw new RuntimeException("Fail 7");
        if (!"10".equals(parts[9])) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static String joinNumbers(int n) {
        if (n <= 0) return "";
        StringBuilder sb = new StringBuilder(n * 4);
        for (int i = 1; i <= n; i++) {
            if (i > 1) sb.append(", ");
            sb.append(i);
        }
        return sb.toString();
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(n)' },
    expectedVisualizer: 'array',
  },
  {
    id: 'golden-core-12',
    title: 'Parsing Delimited Strings with Escapes',
    category: 'CORE_JAVA',
    prompt: 'Parse a single line of CSV supporting double quotes and escaped quotes.',
    expectedConcepts: ['state parsing', 'inQuotes flag', 'StringBuilder', 'delimiter handling'],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        List<String> res1 = Solution.parseCsv("a,b,c");
        if (res1.size() != 3 || !"a".equals(res1.get(0))) throw new RuntimeException("Fail 1");
        List<String> res2 = Solution.parseCsv("\"hello, world\",test");
        if (res2.size() != 2 || !"hello, world".equals(res2.get(0))) throw new RuntimeException("Fail 2");
        List<String> res3 = Solution.parseCsv("\"quotes \"\"inside\"\"\",plain");
        if (!"quotes \"inside\"".equals(res3.get(0))) throw new RuntimeException("Fail 3");
        List<String> res4 = Solution.parseCsv("");
        if (res4.size() != 1 || !"".equals(res4.get(0))) throw new RuntimeException("Fail 4");
        List<String> res5 = Solution.parseCsv("one");
        if (res5.size() != 1 || !"one".equals(res5.get(0))) throw new RuntimeException("Fail 5");
        List<String> res6 = Solution.parseCsv("a,\"\",b");
        if (res6.size() != 3 || !"".equals(res6.get(1))) throw new RuntimeException("Fail 6");
        List<String> res7 = Solution.parseCsv(" , ");
        if (res7.size() != 2) throw new RuntimeException("Fail 7");
        List<String> res8 = Solution.parseCsv("\"a\",\"b\",\"c\"");
        if (!"b".equals(res8.get(1))) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static List<String> parseCsv(String line) {
        List<String> tokens = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    cur.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                tokens.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        tokens.add(cur.toString());
        return tokens;
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(n)' },
    expectedVisualizer: 'array',
  },
  {
    id: 'golden-core-13',
    title: 'Varargs and Method Overload Specificity',
    category: 'CORE_JAVA',
    prompt:
      'Demonstrate compile-time resolution between exact match, widening, boxing, and varargs.',
    expectedConcepts: [
      'widening vs boxing',
      'varargs lowest priority',
      'exact match precedence',
      'overload resolution',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        if (!"exact-int".equals(Solution.test(5))) throw new RuntimeException("Fail 1");
        if (!"widening-long".equals(Solution.test(5L))) throw new RuntimeException("Fail 2");
        if (!"boxing-Integer".equals(Solution.test(Integer.valueOf(5)))) throw new RuntimeException("Fail 3");
        if (!"varargs-int".equals(Solution.test(1, 2, 3))) throw new RuntimeException("Fail 4");
        if (!"varargs-int".equals(Solution.test(1, 2))) throw new RuntimeException("Fail 5");
        if (!"exact-string".equals(Solution.test("hello"))) throw new RuntimeException("Fail 6");
        if (!"object-fallback".equals(Solution.test(new Object()))) throw new RuntimeException("Fail 7");
        if (!"varargs-empty".equals(Solution.testVarargs())) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static String test(int a) { return "exact-int"; }
    public static String test(long a) { return "widening-long"; }
    public static String test(Integer a) { return "boxing-Integer"; }
    public static String test(String a) { return "exact-string"; }
    public static String test(Object a) { return "object-fallback"; }
    public static String test(int a, int... more) { return "varargs-int"; }
    public static String testVarargs(int... nums) { return "varargs-empty"; }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-core-14',
    title: 'Try-With-Resources AutoCloseable Resource Ordering',
    category: 'CORE_JAVA',
    prompt:
      'Implement AutoCloseable resources showing reverse closure order and suppressed exceptions.',
    expectedConcepts: [
      'AutoCloseable',
      'try-with-resources',
      'reverse close order',
      'getSuppressed()',
    ],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        List<String> log = new ArrayList<>();
        try (Res r1 = new Res("R1", log); Res r2 = new Res("R2", log)) {
            log.add("BODY");
        }
        if (!"BODY".equals(log.get(0))) throw new RuntimeException("Fail 1");
        if (!"R2-CLOSED".equals(log.get(1))) throw new RuntimeException("Fail 2");
        if (!"R1-CLOSED".equals(log.get(2))) throw new RuntimeException("Fail 3");
        try {
            try (FaultyRes f1 = new FaultyRes("F1"); FaultyRes f2 = new FaultyRes("F2")) {
                throw new RuntimeException("PRIMARY");
            }
        } catch (RuntimeException e) {
            if (!"PRIMARY".equals(e.getMessage())) throw new RuntimeException("Fail 4");
            Throwable[] supp = e.getSuppressed();
            if (supp.length != 2) throw new RuntimeException("Fail 5");
            if (!"F2-ERROR".equals(supp[0].getMessage())) throw new RuntimeException("Fail 6");
            if (!"F1-ERROR".equals(supp[1].getMessage())) throw new RuntimeException("Fail 7");
        }
        if (log.size() != 3) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Res implements AutoCloseable {
    private final String name;
    private final List<String> log;
    public Res(String name, List<String> log) { this.name = name; this.log = log; }
    public void close() { log.add(name + "-CLOSED"); }
}
class FaultyRes implements AutoCloseable {
    private final String name;
    public FaultyRes(String name) { this.name = name; }
    public void close() { throw new RuntimeException(name + "-ERROR"); }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-core-15',
    title: 'Safe Arithmetic with Overflow Detection',
    category: 'CORE_JAVA',
    prompt:
      'Implement safe addition and multiplication with Math.addExact and Math.multiplyExact throwing ArithmeticException.',
    expectedConcepts: [
      'Math.addExact',
      'Math.multiplyExact',
      'ArithmeticException',
      'integer overflow',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        if (Solution.safeAdd(10, 20) != 30) throw new RuntimeException("Fail 1");
        try {
            Solution.safeAdd(Integer.MAX_VALUE, 1);
            throw new RuntimeException("Fail 2");
        } catch (ArithmeticException e) {}
        try {
            Solution.safeAdd(Integer.MIN_VALUE, -1);
            throw new RuntimeException("Fail 3");
        } catch (ArithmeticException e) {}
        if (Solution.safeMultiply(5, 6) != 30) throw new RuntimeException("Fail 4");
        try {
            Solution.safeMultiply(Integer.MAX_VALUE, 2);
            throw new RuntimeException("Fail 5");
        } catch (ArithmeticException e) {}
        try {
            Solution.safeMultiply(Integer.MIN_VALUE, -1);
            throw new RuntimeException("Fail 6");
        } catch (ArithmeticException e) {}
        if (Solution.safeAdd(0, 0) != 0) throw new RuntimeException("Fail 7");
        if (Solution.safeMultiply(0, Integer.MAX_VALUE) != 0) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static int safeAdd(int a, int b) { return Math.addExact(a, b); }
    public static int safeMultiply(int a, int b) { return Math.multiplyExact(a, b); }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'jvm_memory_2d',
  },

  // ==========================================
  // OOP (12 Cases)
  // ==========================================
  {
    id: 'golden-oop-01',
    title: 'Bank Account with Immutable Transaction History',
    category: 'OOP',
    prompt:
      'Design an encapsulated BankAccount where balance cannot be modified directly and history is unmodifiable.',
    expectedConcepts: [
      'encapsulation',
      'Collections.unmodifiableList',
      'defensive copy',
      'invariants',
    ],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        BankAccount acc = new BankAccount("ACC-1", 100);
        acc.deposit(50);
        acc.withdraw(30);
        if (acc.getBalance() != 120) throw new RuntimeException("Fail 1");
        List<Integer> history = acc.getHistory();
        if (history.size() != 3) throw new RuntimeException("Fail 2");
        try {
            history.add(999);
            throw new RuntimeException("Fail 3");
        } catch (UnsupportedOperationException e) {}
        if (acc.getBalance() != 120) throw new RuntimeException("Fail 4");
        try {
            acc.withdraw(200);
            throw new RuntimeException("Fail 5");
        } catch (IllegalArgumentException e) {}
        try {
            acc.deposit(-10);
            throw new RuntimeException("Fail 6");
        } catch (IllegalArgumentException e) {}
        if (acc.getHistory().get(0) != 100) throw new RuntimeException("Fail 7");
        if (acc.getHistory().get(2) != -30) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class BankAccount {
    private final String id;
    private int balance;
    private final List<Integer> history = new ArrayList<>();
    public BankAccount(String id, int initial) {
        this.id = id;
        this.balance = initial;
        history.add(initial);
    }
    public void deposit(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Positive deposit");
        balance += amount;
        history.add(amount);
    }
    public void withdraw(int amount) {
        if (amount <= 0 || amount > balance) throw new IllegalArgumentException("Invalid withdraw");
        balance -= amount;
        history.add(-amount);
    }
    public int getBalance() { return balance; }
    public List<Integer> getHistory() { return Collections.unmodifiableList(history); }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(n)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-oop-02',
    title: 'Polymorphic Dispatch in Shape Hierarchy',
    category: 'OOP',
    prompt:
      'Implement an abstract BaseShape class with polymorphic area and perimeter calculations.',
    expectedConcepts: ['abstract class', 'dynamic dispatch', 'polymorphism', 'override'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        BaseShape[] shapes = { new CircleShape(5), new RectShape(4, 6) };
        if (Math.abs(shapes[0].area() - 78.539) > 0.01) throw new RuntimeException("Fail 1");
        if (Math.abs(shapes[0].perimeter() - 31.415) > 0.01) throw new RuntimeException("Fail 2");
        if (Math.abs(shapes[1].area() - 24.0) > 0.001) throw new RuntimeException("Fail 3");
        if (Math.abs(shapes[1].perimeter() - 20.0) > 0.001) throw new RuntimeException("Fail 4");
        double total = 0;
        for (BaseShape s : shapes) total += s.area();
        if (Math.abs(total - 102.539) > 0.02) throw new RuntimeException("Fail 5");
        if (!shapes[0].getType().equals("Circle")) throw new RuntimeException("Fail 6");
        if (!shapes[1].getType().equals("Rect")) throw new RuntimeException("Fail 7");
        if (shapes.length != 2) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
abstract class BaseShape {
    public abstract double area();
    public abstract double perimeter();
    public abstract String getType();
}
class CircleShape extends BaseShape {
    private final double r;
    public CircleShape(double r) { this.r = r; }
    public double area() { return Math.PI * r * r; }
    public double perimeter() { return 2 * Math.PI * r; }
    public String getType() { return "Circle"; }
}
class RectShape extends BaseShape {
    private final double w, h;
    public RectShape(double w, double h) { this.w = w; this.h = h; }
    public double area() { return w * h; }
    public double perimeter() { return 2 * (w + h); }
    public String getType() { return "Rect"; }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-oop-03',
    title: 'Composition Over Inheritance: Engine Delegate',
    category: 'OOP',
    prompt: 'Implement a Car class delegating propulsion to an interchangeable Engine interface.',
    expectedConcepts: [
      'composition over inheritance',
      'interface delegation',
      'dependency inversion',
      'loose coupling',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        Car gasCar = new Car(new GasEngine());
        if (!"Gas Engine Vroom".equals(gasCar.start())) throw new RuntimeException("Fail 1");
        Car electricCar = new Car(new ElectricEngine());
        if (!"Silent Electric Humming".equals(electricCar.start())) throw new RuntimeException("Fail 2");
        electricCar.swapEngine(new GasEngine());
        if (!"Gas Engine Vroom".equals(electricCar.start())) throw new RuntimeException("Fail 3");
        if (gasCar.getHorsepower() != 200) throw new RuntimeException("Fail 4");
        if (electricCar.getHorsepower() != 200) throw new RuntimeException("Fail 5");
        electricCar.swapEngine(new ElectricEngine());
        if (electricCar.getHorsepower() != 300) throw new RuntimeException("Fail 6");
        try {
            new Car(null);
            throw new RuntimeException("Fail 7");
        } catch (NullPointerException e) {}
        if (!gasCar.start().contains("Vroom")) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
interface Engine {
    String ignite();
    int horsepower();
}
class GasEngine implements Engine {
    public String ignite() { return "Gas Engine Vroom"; }
    public int horsepower() { return 200; }
}
class ElectricEngine implements Engine {
    public String ignite() { return "Silent Electric Humming"; }
    public int horsepower() { return 300; }
}
class Car {
    private Engine engine;
    public Car(Engine engine) {
        if (engine == null) throw new NullPointerException("Engine required");
        this.engine = engine;
    }
    public void swapEngine(Engine engine) {
        if (engine == null) throw new NullPointerException("Engine required");
        this.engine = engine;
    }
    public String start() { return engine.ignite(); }
    public int getHorsepower() { return engine.horsepower(); }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-oop-04',
    title: 'Strategy Pattern for Dynamic Discount Pricing',
    category: 'OOP',
    prompt:
      'Implement pricing strategies (NoDiscount, PercentageDiscount, TieredDiscount) using Strategy pattern.',
    expectedConcepts: [
      'Strategy pattern',
      'context class',
      'polymorphic execution',
      'open/closed principle',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        Order o = new Order(100.0, new NoDiscount());
        if (o.calculateFinalPrice() != 100.0) throw new RuntimeException("Fail 1");
        o.setStrategy(new PercentageDiscount(0.20));
        if (o.calculateFinalPrice() != 80.0) throw new RuntimeException("Fail 2");
        o.setStrategy(new TieredDiscount());
        if (o.calculateFinalPrice() != 90.0) throw new RuntimeException("Fail 3");
        Order largeOrder = new Order(500.0, new TieredDiscount());
        if (largeOrder.calculateFinalPrice() != 400.0) throw new RuntimeException("Fail 4");
        try {
            new PercentageDiscount(1.5);
            throw new RuntimeException("Fail 5");
        } catch (IllegalArgumentException e) {}
        try {
            new PercentageDiscount(-0.1);
            throw new RuntimeException("Fail 6");
        } catch (IllegalArgumentException e) {}
        Order zero = new Order(0.0, new PercentageDiscount(0.5));
        if (zero.calculateFinalPrice() != 0.0) throw new RuntimeException("Fail 7");
        if (o.getBasePrice() != 100.0) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
interface DiscountStrategy { double apply(double total); }
class NoDiscount implements DiscountStrategy { public double apply(double total) { return total; } }
class PercentageDiscount implements DiscountStrategy {
    private final double pct;
    public PercentageDiscount(double pct) {
        if (pct < 0 || pct > 1.0) throw new IllegalArgumentException("Bad pct");
        this.pct = pct;
    }
    public double apply(double total) { return total * (1.0 - pct); }
}
class TieredDiscount implements DiscountStrategy {
    public double apply(double total) {
        if (total >= 500) return total * 0.8;
        if (total >= 100) return total * 0.9;
        return total;
    }
}
class Order {
    private final double basePrice;
    private DiscountStrategy strategy;
    public Order(double basePrice, DiscountStrategy strategy) {
        this.basePrice = basePrice;
        this.strategy = strategy;
    }
    public void setStrategy(DiscountStrategy s) { this.strategy = s; }
    public double calculateFinalPrice() { return strategy.apply(basePrice); }
    public double getBasePrice() { return basePrice; }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-oop-05',
    title: 'Observer Pattern with Event Notification',
    category: 'OOP',
    prompt:
      'Implement an EventEmitter where listeners subscribe and receive typed notification updates.',
    expectedConcepts: ['Observer pattern', 'publish/subscribe', 'listener list', 'decoupling'],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        Topic topic = new Topic();
        TestListener l1 = new TestListener();
        TestListener l2 = new TestListener();
        topic.subscribe(l1);
        topic.subscribe(l2);
        topic.publish("MSG-1");
        if (l1.events.size() != 1 || l2.events.size() != 1) throw new RuntimeException("Fail 1");
        if (!"MSG-1".equals(l1.events.get(0))) throw new RuntimeException("Fail 2");
        topic.unsubscribe(l1);
        topic.publish("MSG-2");
        if (l1.events.size() != 1) throw new RuntimeException("Fail 3");
        if (l2.events.size() != 2) throw new RuntimeException("Fail 4");
        if (!"MSG-2".equals(l2.events.get(1))) throw new RuntimeException("Fail 5");
        topic.unsubscribe(l2);
        topic.publish("MSG-3");
        if (l2.events.size() != 2) throw new RuntimeException("Fail 6");
        topic.subscribe(l1);
        topic.subscribe(l1); // duplicate test
        topic.publish("MSG-4");
        if (l1.events.size() != 2) throw new RuntimeException("Fail 7");
        if (!"MSG-4".equals(l1.events.get(1))) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
interface EventListener { void onEvent(String event); }
class Topic {
    private final Set<EventListener> listeners = new LinkedHashSet<>();
    public void subscribe(EventListener l) { listeners.add(l); }
    public void unsubscribe(EventListener l) { listeners.remove(l); }
    public void publish(String event) {
        for (EventListener l : listeners) l.onEvent(event);
    }
}
class TestListener implements EventListener {
    public final List<String> events = new ArrayList<>();
    public void onEvent(String e) { events.add(e); }
}
`,
    expectedBigO: { time: 'O(k)', space: 'O(k)' },
    expectedVisualizer: 'graph',
  },
  {
    id: 'golden-oop-06',
    title: 'Factory Method for Document Exporters',
    category: 'OOP',
    prompt:
      'Implement a DocumentExporterFactory returning PDF, HTML, or CSV exporters based on format type.',
    expectedConcepts: [
      'Factory Method',
      'interface contract',
      'IllegalArgumentException for unknown',
      'extensibility',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        Exporter pdf = ExporterFactory.create("PDF");
        if (!"application/pdf".equals(pdf.getContentType())) throw new RuntimeException("Fail 1");
        if (!pdf.export("Doc").startsWith("[PDF]")) throw new RuntimeException("Fail 2");
        Exporter html = ExporterFactory.create("HTML");
        if (!"text/html".equals(html.getContentType())) throw new RuntimeException("Fail 3");
        if (!html.export("Doc").startsWith("<html>")) throw new RuntimeException("Fail 4");
        Exporter csv = ExporterFactory.create("CSV");
        if (!"text/csv".equals(csv.getContentType())) throw new RuntimeException("Fail 5");
        try {
            ExporterFactory.create("UNKNOWN");
            throw new RuntimeException("Fail 6");
        } catch (IllegalArgumentException e) {}
        try {
            ExporterFactory.create(null);
            throw new RuntimeException("Fail 7");
        } catch (IllegalArgumentException e) {}
        if (!csv.export("Doc").contains("Doc")) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
interface Exporter { String export(String content); String getContentType(); }
class PdfExporter implements Exporter {
    public String export(String c) { return "[PDF]" + c; }
    public String getContentType() { return "application/pdf"; }
}
class HtmlExporter implements Exporter {
    public String export(String c) { return "<html>" + c + "</html>"; }
    public String getContentType() { return "text/html"; }
}
class CsvExporter implements Exporter {
    public String export(String c) { return "Content\n" + c; }
    public String getContentType() { return "text/csv"; }
}
class ExporterFactory {
    public static Exporter create(String format) {
        if (format == null) throw new IllegalArgumentException("Null format");
        return switch (format.toUpperCase()) {
            case "PDF" -> new PdfExporter();
            case "HTML" -> new HtmlExporter();
            case "CSV" -> new CsvExporter();
            default -> throw new IllegalArgumentException("Unknown: " + format);
        };
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-oop-07',
    title: 'Sealed Class Algebraic Result Type',
    category: 'OOP',
    prompt:
      'Implement a monadic Result<T, E> sealed hierarchy with Success<T> and Failure<E> records.',
    expectedConcepts: [
      'sealed interface',
      'record components',
      'monadic pattern',
      'exhaustive switch',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        Result<Integer, String> ok = new Result.Success<>(42);
        Result<Integer, String> err = new Result.Failure<>("Division by zero");
        if (!ok.isSuccess()) throw new RuntimeException("Fail 1");
        if (err.isSuccess()) throw new RuntimeException("Fail 2");
        if (ok.getOrThrow() != 42) throw new RuntimeException("Fail 3");
        try {
            err.getOrThrow();
            throw new RuntimeException("Fail 4");
        } catch (RuntimeException e) {
            if (!"Division by zero".equals(e.getMessage())) throw new RuntimeException("Fail 5");
        }
        String descOk = Solution.describeResult(ok);
        if (!"Value: 42".equals(descOk)) throw new RuntimeException("Fail 6");
        String descErr = Solution.describeResult(err);
        if (!"Error: Division by zero".equals(descErr)) throw new RuntimeException("Fail 7");
        if (ok.map(x -> x * 2).getOrThrow() != 84) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
sealed interface Result<T, E> {
    record Success<T, E>(T value) implements Result<T, E> {}
    record Failure<T, E>(E error) implements Result<T, E> {}
    default boolean isSuccess() { return this instanceof Success; }
    default T getOrThrow() {
        if (this instanceof Success<T, E> s) return s.value();
        throw new RuntimeException(String.valueOf(((Failure<T, E>) this).error()));
    }
    default <R> Result<R, E> map(java.util.function.Function<T, R> fn) {
        if (this instanceof Success<T, E> s) return new Success<>(fn.apply(s.value()));
        return new Failure<>(((Failure<T, E>) this).error());
    }
}
class Solution {
    public static String describeResult(Result<Integer, String> res) {
        return switch (res) {
            case Result.Success<Integer, String> s -> "Value: " + s.value();
            case Result.Failure<Integer, String> f -> "Error: " + f.error();
        };
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-oop-08',
    title: 'Deep Copy vs Shallow Copy with Copy Constructor',
    category: 'OOP',
    prompt:
      'Implement a deep-copying copy constructor for an object with nested mutable references.',
    expectedConcepts: [
      'deep copy',
      'shallow copy vulnerability',
      'copy constructor',
      'defensive cloning',
    ],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        Address addr = new Address("Main St", "City");
        List<String> tags = new ArrayList<>(Arrays.asList("A", "B"));
        Profile p1 = new Profile("User", addr, tags);
        Profile p2 = new Profile(p1); // deep copy
        p1.getAddress().setStreet("Second St");
        p1.getTags().add("C");
        if ("Second St".equals(p2.getAddress().getStreet())) throw new RuntimeException("Fail 1");
        if (!"Main St".equals(p2.getAddress().getStreet())) throw new RuntimeException("Fail 2");
        if (p2.getTags().size() != 2) throw new RuntimeException("Fail 3");
        if (p1.getTags().size() != 3) throw new RuntimeException("Fail 4");
        if (!"User".equals(p2.getName())) throw new RuntimeException("Fail 5");
        if (!"City".equals(p2.getAddress().getCity())) throw new RuntimeException("Fail 6");
        if (!p2.getTags().contains("A") || !p2.getTags().contains("B")) throw new RuntimeException("Fail 7");
        if (p2.getTags().contains("C")) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Address {
    private String street, city;
    public Address(String street, String city) { this.street = street; this.city = city; }
    public Address(Address other) { this.street = other.street; this.city = other.city; }
    public String getStreet() { return street; }
    public void setStreet(String s) { this.street = s; }
    public String getCity() { return city; }
}
class Profile {
    private final String name;
    private final Address address;
    private final List<String> tags;
    public Profile(String name, Address addr, List<String> tags) {
        this.name = name;
        this.address = addr;
        this.tags = tags;
    }
    public Profile(Profile other) {
        this.name = other.name;
        this.address = new Address(other.address);
        this.tags = new ArrayList<>(other.tags);
    }
    public String getName() { return name; }
    public Address getAddress() { return address; }
    public List<String> getTags() { return tags; }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(n)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-oop-09',
    title: 'Interface Default Method Conflict Resolution',
    category: 'OOP',
    prompt: 'Resolve multiple inheritance diamond conflicts using Interface.super.methodName().',
    expectedConcepts: [
      'interface default method',
      'diamond problem',
      'InterfaceName.super',
      'explicit override',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        MultiPrinter mp = new MultiPrinter();
        if (!"Alpha and Beta".equals(mp.print())) throw new RuntimeException("Fail 1");
        if (!"Alpha".equals(mp.printAlphaOnly())) throw new RuntimeException("Fail 2");
        if (!"Beta".equals(mp.printBetaOnly())) throw new RuntimeException("Fail 3");
        if (PrinterAlpha.STATIC_VERSION != 1) throw new RuntimeException("Fail 4");
        if (PrinterBeta.STATIC_VERSION != 2) throw new RuntimeException("Fail 5");
        PrinterAlpha pa = mp;
        if (!"Alpha and Beta".equals(pa.print())) throw new RuntimeException("Fail 6");
        PrinterBeta pb = mp;
        if (!"Alpha and Beta".equals(pb.print())) throw new RuntimeException("Fail 7");
        if (!(mp instanceof PrinterAlpha) || !(mp instanceof PrinterBeta)) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
interface PrinterAlpha {
    int STATIC_VERSION = 1;
    default String print() { return "Alpha"; }
}
interface PrinterBeta {
    int STATIC_VERSION = 2;
    default String print() { return "Beta"; }
}
class MultiPrinter implements PrinterAlpha, PrinterBeta {
    public String print() {
        return PrinterAlpha.super.print() + " and " + PrinterBeta.super.print();
    }
    public String printAlphaOnly() { return PrinterAlpha.super.print(); }
    public String printBetaOnly() { return PrinterBeta.super.print(); }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-oop-10',
    title: 'Fluent Builder Pattern with Invariant Checking',
    category: 'OOP',
    prompt: 'Implement a fluent Builder pattern for HttpRequest with validation upon build().',
    expectedConcepts: [
      'Builder pattern',
      'method chaining',
      'IllegalStateException',
      'immutable target',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        HttpRequest req = HttpRequest.builder()
            .url("https://example.com/api")
            .method("POST")
            .header("Content-Type", "application/json")
            .body("{\"key\":\"val\"}")
            .build();
        if (!"POST".equals(req.getMethod())) throw new RuntimeException("Fail 1");
        if (!"https://example.com/api".equals(req.getUrl())) throw new RuntimeException("Fail 2");
        if (!"application/json".equals(req.getHeaders().get("Content-Type"))) throw new RuntimeException("Fail 3");
        if (!req.getBody().isPresent() || !req.getBody().get().contains("key")) throw new RuntimeException("Fail 4");
        try {
            HttpRequest.builder().build();
            throw new RuntimeException("Fail 5");
        } catch (IllegalStateException e) {}
        try {
            HttpRequest.builder().url("https://test.com").method("INVALID").build();
            throw new RuntimeException("Fail 6");
        } catch (IllegalStateException e) {}
        HttpRequest getReq = HttpRequest.builder().url("https://test.com").build();
        if (!"GET".equals(getReq.getMethod())) throw new RuntimeException("Fail 7");
        if (getReq.getBody().isPresent()) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class HttpRequest {
    private final String url, method, body;
    private final java.util.Map<String, String> headers;
    private HttpRequest(Builder b) {
        this.url = b.url;
        this.method = b.method;
        this.body = b.body;
        this.headers = java.util.Collections.unmodifiableMap(new java.util.HashMap<>(b.headers));
    }
    public String getUrl() { return url; }
    public String getMethod() { return method; }
    public java.util.Optional<String> getBody() { return java.util.Optional.ofNullable(body); }
    public java.util.Map<String, String> getHeaders() { return headers; }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private String url;
        private String method = "GET";
        private String body;
        private final java.util.Map<String, String> headers = new java.util.HashMap<>();
        public Builder url(String url) { this.url = url; return this; }
        public Builder method(String method) { this.method = method; return this; }
        public Builder body(String body) { this.body = body; return this; }
        public Builder header(String k, String v) { headers.put(k, v); return this; }
        public HttpRequest build() {
            if (url == null || url.trim().isEmpty()) throw new IllegalStateException("URL required");
            if (!java.util.Set.of("GET", "POST", "PUT", "DELETE", "PATCH").contains(method.toUpperCase())) {
                throw new IllegalStateException("Invalid method: " + method);
            }
            return new HttpRequest(this);
        }
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-oop-11',
    title: 'Decorator Pattern for Data Transformation Stream',
    category: 'OOP',
    prompt:
      'Implement dynamic text transformations using Decorator pattern (BaseText, UpperCaseDecorator, EncryptDecorator).',
    expectedConcepts: [
      'Decorator pattern',
      'wrapping',
      'interface delegate',
      'recursive decoration',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        DataSource raw = new SimpleTextSource("secret");
        if (!"secret".equals(raw.read())) throw new RuntimeException("Fail 1");
        DataSource upper = new UpperCaseDecorator(raw);
        if (!"SECRET".equals(upper.read())) throw new RuntimeException("Fail 2");
        DataSource rot13 = new Rot13Decorator(raw);
        if (!"frperg".equals(rot13.read())) throw new RuntimeException("Fail 3");
        DataSource layered = new UpperCaseDecorator(new Rot13Decorator(new SimpleTextSource("secret")));
        if (!"FRPERG".equals(layered.read())) throw new RuntimeException("Fail 4");
        DataSource back = new Rot13Decorator(new Rot13Decorator(raw));
        if (!"secret".equals(back.read())) throw new RuntimeException("Fail 5");
        if (layered.getSourceType().contains("UpperCase")) throw new RuntimeException("Fail 6"); // check wrapping
        DataSource empty = new UpperCaseDecorator(new SimpleTextSource(""));
        if (!"".equals(empty.read())) throw new RuntimeException("Fail 7");
        if (upper.read().length() != 6) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
interface DataSource { String read(); String getSourceType(); }
class SimpleTextSource implements DataSource {
    private final String text;
    public SimpleTextSource(String text) { this.text = text; }
    public String read() { return text; }
    public String getSourceType() { return "Raw"; }
}
abstract class DataSourceDecorator implements DataSource {
    protected final DataSource wrappee;
    public DataSourceDecorator(DataSource w) { this.wrappee = w; }
    public String getSourceType() { return wrappee.getSourceType(); }
}
class UpperCaseDecorator extends DataSourceDecorator {
    public UpperCaseDecorator(DataSource w) { super(w); }
    public String read() { return wrappee.read().toUpperCase(); }
}
class Rot13Decorator extends DataSourceDecorator {
    public Rot13Decorator(DataSource w) { super(w); }
    public String read() {
        StringBuilder sb = new StringBuilder();
        for (char c : wrappee.read().toCharArray()) {
            if (c >= 'a' && c <= 'm') c += 13;
            else if (c >= 'n' && c <= 'z') c -= 13;
            else if (c >= 'A' && c <= 'M') c += 13;
            else if (c >= 'N' && c <= 'Z') c -= 13;
            sb.append(c);
        }
        return sb.toString();
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(n)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-oop-12',
    title: 'Template Method Pattern for Data Pipeline',
    category: 'OOP',
    prompt:
      'Implement an abstract ETL pipeline defining final run() algorithm with primitive steps overridden in subclasses.',
    expectedConcepts: [
      'Template Method pattern',
      'final algorithm skeleton',
      'hook methods',
      'subclass customization',
    ],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        TestEtl csv = new CsvEtl();
        List<String> r1 = csv.execute();
        if (r1.size() != 3 || !"CSV-RAW".equals(r1.get(0))) throw new RuntimeException("Fail 1");
        if (!"CSV-FILTERED".equals(r1.get(1))) throw new RuntimeException("Fail 2");
        if (!"CSV-LOADED".equals(r1.get(2))) throw new RuntimeException("Fail 3");
        TestEtl json = new JsonEtl();
        List<String> r2 = json.execute();
        if (!"JSON-RAW".equals(r2.get(0))) throw new RuntimeException("Fail 4");
        if (!"JSON-LOADED".equals(r2.get(2))) throw new RuntimeException("Fail 5");
        if (csv.isHookInvoked()) throw new RuntimeException("Fail 6");
        json.enableHook();
        json.execute();
        if (!json.isHookInvoked()) throw new RuntimeException("Fail 7");
        if (r1.size() != r2.size()) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
abstract class TestEtl {
    protected boolean hookInvoked = false;
    protected boolean enableHookFlag = false;
    public void enableHook() { enableHookFlag = true; }
    public boolean isHookInvoked() { return hookInvoked; }
    public final List<String> execute() {
        List<String> log = new ArrayList<>();
        log.add(extract());
        log.add(transform());
        log.add(load());
        if (enableHookFlag) { hook(); }
        return log;
    }
    protected abstract String extract();
    protected abstract String transform();
    protected abstract String load();
    protected void hook() { hookInvoked = true; }
}
class CsvEtl extends TestEtl {
    protected String extract() { return "CSV-RAW"; }
    protected String transform() { return "CSV-FILTERED"; }
    protected String load() { return "CSV-LOADED"; }
}
class JsonEtl extends TestEtl {
    protected String extract() { return "JSON-RAW"; }
    protected String transform() { return "JSON-TRANSFORMED"; }
    protected String load() { return "JSON-LOADED"; }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'graph',
  },

  // ==========================================
  // DSA (15 Cases)
  // ==========================================
  {
    id: 'golden-dsa-01',
    title: 'Linked List Cycle Detection (Floyd)',
    category: 'DSA',
    prompt:
      "Detect if a singly linked list contains a cycle using Floyd's Tortoise and Hare algorithm.",
    expectedConcepts: [
      'Floyd algorithm',
      'fast and slow pointer',
      'O(1) memory',
      'pointer equality',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        ListNode n1 = new ListNode(1);
        ListNode n2 = new ListNode(2);
        ListNode n3 = new ListNode(3);
        n1.next = n2; n2.next = n3; n3.next = n1;
        if (!Solution.hasCycle(n1)) throw new RuntimeException("Fail 1");
        n3.next = null;
        if (Solution.hasCycle(n1)) throw new RuntimeException("Fail 2");
        if (Solution.hasCycle(null)) throw new RuntimeException("Fail 3");
        ListNode single = new ListNode(42);
        if (Solution.hasCycle(single)) throw new RuntimeException("Fail 4");
        single.next = single;
        if (!Solution.hasCycle(single)) throw new RuntimeException("Fail 5");
        ListNode n4 = new ListNode(4);
        n3.next = n4; n4.next = n2;
        if (!Solution.hasCycle(n1)) throw new RuntimeException("Fail 6");
        n4.next = null;
        if (Solution.hasCycle(n1)) throw new RuntimeException("Fail 7");
        if (Solution.hasCycle(new ListNode(0))) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class ListNode { int val; ListNode next; ListNode(int v) { this.val = v; } }
class Solution {
    public static boolean hasCycle(ListNode head) {
        if (head == null || head.next == null) return false;
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(1)' },
    expectedVisualizer: 'linked_list',
  },
  {
    id: 'golden-dsa-02',
    title: 'Iterative Reverse Linked List',
    category: 'DSA',
    prompt: 'Reverse a singly linked list in-place iteratively and return the new head.',
    expectedConcepts: ['prev pointer', 'curr pointer', 'next temp pointer', 'O(1) space'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        ListNode n1 = new ListNode(1);
        n1.next = new ListNode(2);
        n1.next.next = new ListNode(3);
        ListNode rev = Solution.reverse(n1);
        if (rev.val != 3) throw new RuntimeException("Fail 1");
        if (rev.next.val != 2) throw new RuntimeException("Fail 2");
        if (rev.next.next.val != 1) throw new RuntimeException("Fail 3");
        if (rev.next.next.next != null) throw new RuntimeException("Fail 4");
        if (Solution.reverse(null) != null) throw new RuntimeException("Fail 5");
        ListNode single = new ListNode(42);
        if (Solution.reverse(single).val != 42) throw new RuntimeException("Fail 6");
        ListNode two = new ListNode(10); two.next = new ListNode(20);
        ListNode revTwo = Solution.reverse(two);
        if (revTwo.val != 20 || revTwo.next.val != 10) throw new RuntimeException("Fail 7");
        if (revTwo.next.next != null) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class ListNode { int val; ListNode next; ListNode(int v) { this.val = v; } }
class Solution {
    public static ListNode reverse(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(1)' },
    expectedVisualizer: 'linked_list',
  },
  {
    id: 'golden-dsa-03',
    title: 'Min Stack with O(1) Minimum Lookup',
    category: 'DSA',
    prompt: 'Implement a MinStack supporting push, pop, top, and getMin in O(1) time.',
    expectedConcepts: [
      'auxiliary stack',
      'O(1) getMin',
      'EmptyStackException',
      'parallel tracking',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        MinStack s = new MinStack();
        s.push(-2);
        s.push(0);
        s.push(-3);
        if (s.getMin() != -3) throw new RuntimeException("Fail 1");
        s.pop();
        if (s.top() != 0) throw new RuntimeException("Fail 2");
        if (s.getMin() != -2) throw new RuntimeException("Fail 3");
        s.push(-2);
        if (s.getMin() != -2) throw new RuntimeException("Fail 4");
        s.pop();
        if (s.getMin() != -2) throw new RuntimeException("Fail 5");
        s.pop();
        if (s.getMin() != -2) throw new RuntimeException("Fail 6");
        s.pop();
        if (!s.isEmpty()) throw new RuntimeException("Fail 7");
        s.push(42);
        if (s.getMin() != 42) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class MinStack {
    private final java.util.ArrayDeque<Integer> stack = new java.util.ArrayDeque<>();
    private final java.util.ArrayDeque<Integer> minStack = new java.util.ArrayDeque<>();
    public void push(int val) {
        stack.push(val);
        if (minStack.isEmpty() || val <= minStack.peek()) {
            minStack.push(val);
        }
    }
    public void pop() {
        int v = stack.pop();
        if (v == minStack.peek()) minStack.pop();
    }
    public int top() { return stack.peek(); }
    public int getMin() { return minStack.peek(); }
    public boolean isEmpty() { return stack.isEmpty(); }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(n)' },
    expectedVisualizer: 'stack_queue',
  },
  {
    id: 'golden-dsa-04',
    title: 'Valid Parentheses String Matching',
    category: 'DSA',
    prompt: 'Check whether a string of braces (), [], {} is correctly balanced using a stack.',
    expectedConcepts: ['Stack', 'bracket matching', 'early false return', 'empty stack at end'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        if (!Solution.isValid("()")) throw new RuntimeException("Fail 1");
        if (!Solution.isValid("()[]{}")) throw new RuntimeException("Fail 2");
        if (Solution.isValid("(]")) throw new RuntimeException("Fail 3");
        if (Solution.isValid("([)]")) throw new RuntimeException("Fail 4");
        if (!Solution.isValid("{[]}")) throw new RuntimeException("Fail 5");
        if (Solution.isValid("[")) throw new RuntimeException("Fail 6");
        if (Solution.isValid("]")) throw new RuntimeException("Fail 7");
        if (!Solution.isValid("")) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static boolean isValid(String s) {
        java.util.ArrayDeque<Character> st = new java.util.ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') st.push(')');
            else if (c == '[') st.push(']');
            else if (c == '{') st.push('}');
            else if (st.isEmpty() || st.pop() != c) return false;
        }
        return st.isEmpty();
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(n)' },
    expectedVisualizer: 'stack_queue',
  },
  {
    id: 'golden-dsa-05',
    title: 'Queue Implementation Using Two Stacks',
    category: 'DSA',
    prompt: 'Implement a FIFO Queue using two LIFO stacks with amortized O(1) operations.',
    expectedConcepts: [
      'two stacks',
      'amortized O(1)',
      'inStack / outStack transfer',
      'FIFO ordering',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        MyQueue q = new MyQueue();
        q.push(1);
        q.push(2);
        if (q.peek() != 1) throw new RuntimeException("Fail 1");
        if (q.pop() != 1) throw new RuntimeException("Fail 2");
        q.push(3);
        if (q.pop() != 2) throw new RuntimeException("Fail 3");
        if (q.pop() != 3) throw new RuntimeException("Fail 4");
        if (!q.empty()) throw new RuntimeException("Fail 5");
        q.push(10);
        if (q.empty()) throw new RuntimeException("Fail 6");
        if (q.peek() != 10) throw new RuntimeException("Fail 7");
        if (q.pop() != 10) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class MyQueue {
    private final java.util.ArrayDeque<Integer> in = new java.util.ArrayDeque<>();
    private final java.util.ArrayDeque<Integer> out = new java.util.ArrayDeque<>();
    public void push(int x) { in.push(x); }
    public int pop() { shift(); return out.pop(); }
    public int peek() { shift(); return out.peek(); }
    public boolean empty() { return in.isEmpty() && out.isEmpty(); }
    private void shift() {
        if (out.isEmpty()) {
            while (!in.isEmpty()) out.push(in.pop());
        }
    }
}
`,
    expectedBigO: { time: 'O(1) amortized', space: 'O(n)' },
    expectedVisualizer: 'stack_queue',
  },
  {
    id: 'golden-dsa-06',
    title: 'Binary Search Leftmost Insertion Point',
    category: 'DSA',
    prompt:
      'Find the starting and ending index of a target value in a sorted array in O(log n) time.',
    expectedConcepts: ['binary search', 'left boundary', 'right boundary', 'logarithmic time'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        int[] res1 = Solution.searchRange(new int[]{5,7,7,8,8,10}, 8);
        if (res1[0] != 3 || res1[1] != 4) throw new RuntimeException("Fail 1");
        int[] res2 = Solution.searchRange(new int[]{5,7,7,8,8,10}, 6);
        if (res2[0] != -1 || res2[1] != -1) throw new RuntimeException("Fail 2");
        int[] res3 = Solution.searchRange(new int[]{}, 0);
        if (res3[0] != -1 || res3[1] != -1) throw new RuntimeException("Fail 3");
        int[] res4 = Solution.searchRange(new int[]{1}, 1);
        if (res4[0] != 0 || res4[1] != 0) throw new RuntimeException("Fail 4");
        int[] res5 = Solution.searchRange(new int[]{2, 2, 2, 2}, 2);
        if (res5[0] != 0 || res5[1] != 3) throw new RuntimeException("Fail 5");
        int[] res6 = Solution.searchRange(new int[]{1, 3, 5}, 1);
        if (res6[0] != 0 || res6[1] != 0) throw new RuntimeException("Fail 6");
        int[] res7 = Solution.searchRange(new int[]{1, 3, 5}, 5);
        if (res7[0] != 2 || res7[1] != 2) throw new RuntimeException("Fail 7");
        int[] res8 = Solution.searchRange(new int[]{1, 2, 3, 4, 5}, 6);
        if (res8[0] != -1) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static int[] searchRange(int[] nums, int target) {
        int left = findBound(nums, target, true);
        if (left == -1) return new int[]{-1, -1};
        int right = findBound(nums, target, false);
        return new int[]{left, right};
    }
    private static int findBound(int[] nums, int target, boolean isFirst) {
        int l = 0, r = nums.length - 1, ans = -1;
        while (l <= r) {
            int mid = l + (r - l) / 2;
            if (nums[mid] == target) {
                ans = mid;
                if (isFirst) r = mid - 1;
                else l = mid + 1;
            } else if (nums[mid] < target) l = mid + 1;
            else r = mid - 1;
        }
        return ans;
    }
}
`,
    expectedBigO: { time: 'O(log n)', space: 'O(1)' },
    expectedVisualizer: 'array',
  },
  {
    id: 'golden-dsa-07',
    title: 'Binary Tree Level-Order Traversal (BFS)',
    category: 'DSA',
    prompt: "Return the level-order traversal of a binary tree's values level by level using BFS.",
    expectedConcepts: ['Queue', 'level-order traversal', 'BFS', 'level size iteration'],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        TreeNode root = new TreeNode(3);
        root.left = new TreeNode(9);
        root.right = new TreeNode(20);
        root.right.left = new TreeNode(15);
        root.right.right = new TreeNode(7);
        List<List<Integer>> res = Solution.levelOrder(root);
        if (res.size() != 3) throw new RuntimeException("Fail 1");
        if (res.get(0).get(0) != 3) throw new RuntimeException("Fail 2");
        if (res.get(1).size() != 2 || res.get(1).get(0) != 9) throw new RuntimeException("Fail 3");
        if (res.get(2).size() != 2 || res.get(2).get(1) != 7) throw new RuntimeException("Fail 4");
        if (!Solution.levelOrder(null).isEmpty()) throw new RuntimeException("Fail 5");
        TreeNode single = new TreeNode(1);
        List<List<Integer>> singleRes = Solution.levelOrder(single);
        if (singleRes.size() != 1 || singleRes.get(0).get(0) != 1) throw new RuntimeException("Fail 6");
        TreeNode leftOnly = new TreeNode(1); leftOnly.left = new TreeNode(2);
        if (Solution.levelOrder(leftOnly).size() != 2) throw new RuntimeException("Fail 7");
        if (res.get(2).get(0) != 15) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class TreeNode { int val; TreeNode left, right; TreeNode(int v) { this.val = v; } }
class Solution {
    public static List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        Queue<TreeNode> q = new ArrayDeque<>();
        q.offer(root);
        while (!q.isEmpty()) {
            int size = q.size();
            List<Integer> level = new ArrayList<>(size);
            for (int i = 0; i < size; i++) {
                TreeNode cur = q.poll();
                level.add(cur.val);
                if (cur.left != null) q.offer(cur.left);
                if (cur.right != null) q.offer(cur.right);
            }
            result.add(level);
        }
        return result;
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(n)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-dsa-08',
    title: 'Validate Binary Search Tree (BST)',
    category: 'DSA',
    prompt: 'Determine if a binary tree is a valid Binary Search Tree with strict min/max bounds.',
    expectedConcepts: ['BST invariant', 'min/max range', 'Long.MIN_VALUE', 'recursion'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        TreeNode root = new TreeNode(2);
        root.left = new TreeNode(1);
        root.right = new TreeNode(3);
        if (!Solution.isValidBST(root)) throw new RuntimeException("Fail 1");
        TreeNode invalid = new TreeNode(5);
        invalid.left = new TreeNode(1);
        invalid.right = new TreeNode(4);
        invalid.right.left = new TreeNode(3);
        invalid.right.right = new TreeNode(6);
        if (Solution.isValidBST(invalid)) throw new RuntimeException("Fail 2");
        if (!Solution.isValidBST(null)) throw new RuntimeException("Fail 3");
        if (!Solution.isValidBST(new TreeNode(42))) throw new RuntimeException("Fail 4");
        TreeNode duplicate = new TreeNode(2);
        duplicate.left = new TreeNode(2);
        if (Solution.isValidBST(duplicate)) throw new RuntimeException("Fail 5");
        TreeNode maxVal = new TreeNode(Integer.MAX_VALUE);
        if (!Solution.isValidBST(maxVal)) throw new RuntimeException("Fail 6");
        TreeNode invalidSub = new TreeNode(10);
        invalidSub.left = new TreeNode(5);
        invalidSub.left.right = new TreeNode(15);
        if (Solution.isValidBST(invalidSub)) throw new RuntimeException("Fail 7");
        TreeNode validDeep = new TreeNode(10);
        validDeep.left = new TreeNode(5);
        validDeep.left.right = new TreeNode(8);
        if (!Solution.isValidBST(validDeep)) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class TreeNode { int val; TreeNode left, right; TreeNode(int v) { this.val = v; } }
class Solution {
    public static boolean isValidBST(TreeNode root) {
        return check(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }
    private static boolean check(TreeNode node, long min, long max) {
        if (node == null) return true;
        if (node.val <= min || node.val >= max) return false;
        return check(node.left, min, node.val) && check(node.right, node.val, max);
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(h)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-dsa-09',
    title: 'Lowest Common Ancestor in Binary Tree',
    category: 'DSA',
    prompt: 'Find the lowest common ancestor (LCA) of two given nodes in a binary tree.',
    expectedConcepts: [
      'recursive divide and conquer',
      'LCA base cases',
      'left and right non-null check',
      'O(n) time',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        TreeNode root = new TreeNode(3);
        TreeNode p = new TreeNode(5);
        TreeNode q = new TreeNode(1);
        root.left = p; root.right = q;
        TreeNode pLeft = new TreeNode(6);
        TreeNode pRight = new TreeNode(2);
        p.left = pLeft; p.right = pRight;
        TreeNode lca = Solution.lowestCommonAncestor(root, p, q);
        if (lca.val != 3) throw new RuntimeException("Fail 1");
        TreeNode lcaSub = Solution.lowestCommonAncestor(root, pLeft, pRight);
        if (lcaSub.val != 5) throw new RuntimeException("Fail 2");
        TreeNode lcaParentChild = Solution.lowestCommonAncestor(root, p, pLeft);
        if (lcaParentChild.val != 5) throw new RuntimeException("Fail 3");
        if (Solution.lowestCommonAncestor(null, p, q) != null) throw new RuntimeException("Fail 4");
        TreeNode single = new TreeNode(42);
        if (Solution.lowestCommonAncestor(single, single, single).val != 42) throw new RuntimeException("Fail 5");
        TreeNode rightChild = new TreeNode(8);
        q.right = rightChild;
        if (Solution.lowestCommonAncestor(root, pLeft, rightChild).val != 3) throw new RuntimeException("Fail 6");
        if (Solution.lowestCommonAncestor(root, q, rightChild).val != 1) throw new RuntimeException("Fail 7");
        if (lca.val != root.val) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class TreeNode { int val; TreeNode left, right; TreeNode(int v) { this.val = v; } }
class Solution {
    public static TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        if (root == null || root == p || root == q) return root;
        TreeNode left = lowestCommonAncestor(root.left, p, q);
        TreeNode right = lowestCommonAncestor(root.right, p, q);
        if (left != null && right != null) return root;
        return left != null ? left : right;
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(h)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-dsa-10',
    title: 'Invert / Mirror Binary Tree',
    category: 'DSA',
    prompt: 'Invert a binary tree in-place so all left children swap with right children.',
    expectedConcepts: [
      'recursion',
      'swap children',
      'post-order / pre-order traversal',
      'O(n) time',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        TreeNode root = new TreeNode(4);
        root.left = new TreeNode(2);
        root.right = new TreeNode(7);
        root.left.left = new TreeNode(1);
        root.left.right = new TreeNode(3);
        TreeNode inverted = Solution.invertTree(root);
        if (inverted.val != 4) throw new RuntimeException("Fail 1");
        if (inverted.left.val != 7) throw new RuntimeException("Fail 2");
        if (inverted.right.val != 2) throw new RuntimeException("Fail 3");
        if (inverted.right.left.val != 3) throw new RuntimeException("Fail 4");
        if (inverted.right.right.val != 1) throw new RuntimeException("Fail 5");
        if (Solution.invertTree(null) != null) throw new RuntimeException("Fail 6");
        TreeNode single = new TreeNode(99);
        if (Solution.invertTree(single).val != 99) throw new RuntimeException("Fail 7");
        Solution.invertTree(inverted); // double invert restores
        if (inverted.left.val != 2 || inverted.right.val != 7) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class TreeNode { int val; TreeNode left, right; TreeNode(int v) { this.val = v; } }
class Solution {
    public static TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        TreeNode temp = root.left;
        root.left = invertTree(root.right);
        root.right = invertTree(temp);
        return root;
    }
}
`,
    expectedBigO: { time: 'O(n)', space: 'O(h)' },
    expectedVisualizer: 'tree_heap',
  },
  {
    id: 'golden-dsa-11',
    title: 'Shortest Path in Unweighted Graph (BFS)',
    category: 'DSA',
    prompt:
      'Find the length of the shortest path between start and end node in an unweighted graph using BFS.',
    expectedConcepts: ['Breadth-First Search', 'unweighted shortest path', 'visited set', 'queue'],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        Map<Integer, List<Integer>> adj = new HashMap<>();
        adj.put(0, List.of(1, 2));
        adj.put(1, List.of(0, 3));
        adj.put(2, List.of(0, 3));
        adj.put(3, List.of(1, 2, 4));
        adj.put(4, List.of(3));
        if (Solution.shortestPath(adj, 0, 4) != 3) throw new RuntimeException("Fail 1");
        if (Solution.shortestPath(adj, 0, 3) != 2) throw new RuntimeException("Fail 2");
        if (Solution.shortestPath(adj, 0, 0) != 0) throw new RuntimeException("Fail 3");
        if (Solution.shortestPath(adj, 0, 99) != -1) throw new RuntimeException("Fail 4");
        adj.put(10, List.of(11));
        adj.put(11, List.of(10));
        if (Solution.shortestPath(adj, 0, 10) != -1) throw new RuntimeException("Fail 5");
        if (Solution.shortestPath(adj, 4, 0) != 3) throw new RuntimeException("Fail 6");
        if (Solution.shortestPath(adj, 1, 2) != 2) throw new RuntimeException("Fail 7");
        if (Solution.shortestPath(adj, 0, 1) != 1) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static int shortestPath(Map<Integer, List<Integer>> adj, int start, int target) {
        if (start == target) return 0;
        Queue<int[]> q = new ArrayDeque<>();
        Set<Integer> visited = new HashSet<>();
        q.offer(new int[]{start, 0});
        visited.add(start);
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int u = cur[0], dist = cur[1];
            List<Integer> neighbors = adj.getOrDefault(u, Collections.emptyList());
            for (int v : neighbors) {
                if (v == target) return dist + 1;
                if (visited.add(v)) {
                    q.offer(new int[]{v, dist + 1});
                }
            }
        }
        return -1;
    }
}
`,
    expectedBigO: { time: 'O(V + E)', space: 'O(V)' },
    expectedVisualizer: 'graph',
  },
  {
    id: 'golden-dsa-12',
    title: 'Directed Graph Cycle Detection (DFS Colors)',
    category: 'DSA',
    prompt: 'Detect if a directed graph contains a cycle using 3-color DFS (WHITE, GRAY, BLACK).',
    expectedConcepts: [
      'topological sorting',
      'three-color DFS',
      'back-edge detection',
      'directed cycle',
    ],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        int[][] edgesCycle = {{0, 1}, {1, 2}, {2, 0}};
        if (!Solution.hasCycle(3, edgesCycle)) throw new RuntimeException("Fail 1");
        int[][] edgesAcyclic = {{0, 1}, {1, 2}, {2, 3}};
        if (Solution.hasCycle(4, edgesAcyclic)) throw new RuntimeException("Fail 2");
        int[][] selfLoop = {{0, 0}};
        if (!Solution.hasCycle(1, selfLoop)) throw new RuntimeException("Fail 3");
        int[][] empty = {};
        if (Solution.hasCycle(5, empty)) throw new RuntimeException("Fail 4");
        int[][] disconnectedCycle = {{0, 1}, {2, 3}, {3, 2}};
        if (!Solution.hasCycle(4, disconnectedCycle)) throw new RuntimeException("Fail 5");
        int[][] diamond = {{0, 1}, {0, 2}, {1, 3}, {2, 3}};
        if (Solution.hasCycle(4, diamond)) throw new RuntimeException("Fail 6");
        int[][] backEdge = {{0, 1}, {1, 2}, {2, 3}, {3, 1}};
        if (!Solution.hasCycle(4, backEdge)) throw new RuntimeException("Fail 7");
        if (Solution.hasCycle(0, empty)) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static boolean hasCycle(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>(n);
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        int[] color = new int[n]; // 0: White, 1: Gray, 2: Black
        for (int i = 0; i < n; i++) {
            if (color[i] == 0 && dfs(i, adj, color)) return true;
        }
        return false;
    }
    private static boolean dfs(int u, List<List<Integer>> adj, int[] color) {
        color[u] = 1;
        for (int v : adj.get(u)) {
            if (color[v] == 1) return true;
            if (color[v] == 0 && dfs(v, adj, color)) return true;
        }
        color[u] = 2;
        return false;
    }
}
`,
    expectedBigO: { time: 'O(V + E)', space: 'O(V)' },
    expectedVisualizer: 'graph',
  },
  {
    id: 'golden-dsa-13',
    title: 'Merge Sorted Array In-Place',
    category: 'DSA',
    prompt: 'Merge two sorted arrays nums1 and nums2 into nums1 in-place starting from the end.',
    expectedConcepts: ['three pointers', 'reverse iteration', 'in-place merge', 'O(1) extra space'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        int[] n1 = {1, 2, 3, 0, 0, 0};
        Solution.merge(n1, 3, new int[]{2, 5, 6}, 3);
        if (n1[0] != 1 || n1[1] != 2 || n1[2] != 2 || n1[3] != 3 || n1[4] != 5 || n1[5] != 6) throw new RuntimeException("Fail 1");
        int[] n2 = {1};
        Solution.merge(n2, 1, new int[]{}, 0);
        if (n2[0] != 1) throw new RuntimeException("Fail 2");
        int[] n3 = {0};
        Solution.merge(n3, 0, new int[]{1}, 1);
        if (n3[0] != 1) throw new RuntimeException("Fail 3");
        int[] n4 = {4, 5, 6, 0, 0, 0};
        Solution.merge(n4, 3, new int[]{1, 2, 3}, 3);
        if (n4[0] != 1 || n4[5] != 6) throw new RuntimeException("Fail 4");
        int[] n5 = {2, 0};
        Solution.merge(n5, 1, new int[]{1}, 1);
        if (n5[0] != 1 || n5[1] != 2) throw new RuntimeException("Fail 5");
        int[] n6 = {-5, -2, 0, 0, 0};
        Solution.merge(n6, 2, new int[]{-10, -1, 4}, 3);
        if (n6[0] != -10 || n6[4] != 4) throw new RuntimeException("Fail 6");
        if (n6[1] != -5 || n6[2] != -2) throw new RuntimeException("Fail 7");
        if (n1.length != 6) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static void merge(int[] nums1, int m, int[] nums2, int n) {
        int p1 = m - 1, p2 = n - 1, p = m + n - 1;
        while (p2 >= 0) {
            if (p1 >= 0 && nums1[p1] > nums2[p2]) {
                nums1[p--] = nums1[p1--];
            } else {
                nums1[p--] = nums2[p2--];
            }
        }
    }
}
`,
    expectedBigO: { time: 'O(m + n)', space: 'O(1)' },
    expectedVisualizer: 'array',
  },
  {
    id: 'golden-dsa-14',
    title: 'LRU Cache Design (HashMap + Doubly Linked List)',
    category: 'DSA',
    prompt:
      'Implement an LRU Cache with get and put in O(1) time using a HashMap and Doubly Linked List.',
    expectedConcepts: ['HashMap', 'Doubly Linked List', 'O(1) get and put', 'eviction policy'],
    testCode: `
public class Harness {
    public static void main(String[] args) {
        LRUCache cache = new LRUCache(2);
        cache.put(1, 1);
        cache.put(2, 2);
        if (cache.get(1) != 1) throw new RuntimeException("Fail 1");
        cache.put(3, 3); // evicts key 2
        if (cache.get(2) != -1) throw new RuntimeException("Fail 2");
        cache.put(4, 4); // evicts key 1
        if (cache.get(1) != -1) throw new RuntimeException("Fail 3");
        if (cache.get(3) != 3) throw new RuntimeException("Fail 4");
        if (cache.get(4) != 4) throw new RuntimeException("Fail 5");
        cache.put(4, 40); // update existing key
        if (cache.get(4) != 40) throw new RuntimeException("Fail 6");
        LRUCache single = new LRUCache(1);
        single.put(10, 100);
        single.put(20, 200);
        if (single.get(10) != -1 || single.get(20) != 200) throw new RuntimeException("Fail 7");
        if (cache.get(99) != -1) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class LRUCache {
    static class Node { int key, val; Node prev, next; Node(int k, int v) { this.key = k; this.val = v; } }
    private final int cap;
    private final java.util.Map<Integer, Node> map = new java.util.HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);
    public LRUCache(int cap) {
        this.cap = cap;
        head.next = tail;
        tail.prev = head;
    }
    public int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        remove(n);
        insert(n);
        return n.val;
    }
    public void put(int key, int val) {
        if (map.containsKey(key)) remove(map.get(key));
        if (map.size() == cap) {
            map.remove(tail.prev.key);
            remove(tail.prev);
        }
        Node n = new Node(key, val);
        insert(n);
        map.put(key, n);
    }
    private void remove(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void insert(Node n) { n.next = head.next; n.next.prev = n; head.next = n; n.prev = head; }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(capacity)' },
    expectedVisualizer: 'hash_table',
  },
  {
    id: 'golden-dsa-15',
    title: 'Kth Largest Element Using Min-Heap',
    category: 'DSA',
    prompt:
      'Find the kth largest element in an unsorted array using a bounded min-heap PriorityQueue.',
    expectedConcepts: ['PriorityQueue', 'min-heap', 'O(n log k) time', 'O(k) memory'],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        if (Solution.findKthLargest(new int[]{3,2,1,5,6,4}, 2) != 5) throw new RuntimeException("Fail 1");
        if (Solution.findKthLargest(new int[]{3,2,3,1,2,4,5,5,6}, 4) != 4) throw new RuntimeException("Fail 2");
        if (Solution.findKthLargest(new int[]{1}, 1) != 1) throw new RuntimeException("Fail 3");
        if (Solution.findKthLargest(new int[]{7, 10, 4, 3, 20, 15}, 3) != 10) throw new RuntimeException("Fail 4");
        if (Solution.findKthLargest(new int[]{7, 10, 4, 3, 20, 15}, 1) != 20) throw new RuntimeException("Fail 5");
        if (Solution.findKthLargest(new int[]{7, 10, 4, 3, 20, 15}, 6) != 3) throw new RuntimeException("Fail 6");
        if (Solution.findKthLargest(new int[]{-1, -2, -3}, 1) != -1) throw new RuntimeException("Fail 7");
        if (Solution.findKthLargest(new int[]{5, 5, 5, 5}, 2) != 5) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> pq = new PriorityQueue<>(k);
        for (int v : nums) {
            pq.offer(v);
            if (pq.size() > k) pq.poll();
        }
        return pq.peek();
    }
}
`,
    expectedBigO: { time: 'O(n log k)', space: 'O(k)' },
    expectedVisualizer: 'tree_heap',
  },

  // ==========================================
  // CONCURRENCY & MODERN JAVA (8 Cases)
  // ==========================================
  {
    id: 'golden-conc-01',
    title: 'Thread-Safe Bounded Blocking Queue',
    category: 'CONCURRENCY',
    prompt:
      'Implement a thread-safe bounded queue with ReentrantLock and Condition variables (notFull, notEmpty).',
    expectedConcepts: [
      'ReentrantLock',
      'Condition notFull',
      'Condition notEmpty',
      'await and signal',
    ],
    testCode: `
import java.util.concurrent.locks.*;
public class Harness {
    public static void main(String[] args) throws Exception {
        BoundedQueue<Integer> q = new BoundedQueue<>(2);
        q.put(1);
        q.put(2);
        if (q.take() != 1) throw new RuntimeException("Fail 1");
        q.put(3);
        if (q.take() != 2) throw new RuntimeException("Fail 2");
        if (q.take() != 3) throw new RuntimeException("Fail 3");
        if (q.size() != 0) throw new RuntimeException("Fail 4");
        Thread producer = new Thread(() -> {
            try { Thread.sleep(20); q.put(99); } catch (Exception ignored) {}
        });
        producer.start();
        int val = q.take(); // blocks until produced
        if (val != 99) throw new RuntimeException("Fail 5");
        producer.join();
        if (q.size() != 0) throw new RuntimeException("Fail 6");
        q.put(10);
        if (q.size() != 1) throw new RuntimeException("Fail 7");
        if (q.take() != 10) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class BoundedQueue<T> {
    private final Object[] items;
    private int count, head, tail;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();
    public BoundedQueue(int capacity) { items = new Object[capacity]; }
    public void put(T x) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length) notFull.await();
            items[tail] = x;
            if (++tail == items.length) tail = 0;
            count++;
            notEmpty.signal();
        } finally { lock.unlock(); }
    }
    @SuppressWarnings("unchecked")
    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) notEmpty.await();
            T x = (T) items[head];
            items[head] = null;
            if (++head == items.length) head = 0;
            count--;
            notFull.signal();
            return x;
        } finally { lock.unlock(); }
    }
    public int size() {
        lock.lock();
        try { return count; } finally { lock.unlock(); }
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(capacity)' },
    expectedVisualizer: 'stack_queue',
  },
  {
    id: 'golden-conc-02',
    title: 'AtomicInteger Optimistic Spin Lock',
    category: 'CONCURRENCY',
    prompt:
      'Implement an optimistic spin-lock counter using AtomicInteger compareAndSet without blocking.',
    expectedConcepts: ['AtomicInteger', 'compareAndSet', 'optimistic concurrency', 'CAS loop'],
    testCode: `
import java.util.concurrent.atomic.*;
public class Harness {
    public static void main(String[] args) throws Exception {
        CasCounter c = new CasCounter();
        Thread[] threads = new Thread[10];
        for (int i = 0; i < threads.length; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 500; j++) c.increment();
            });
            threads[i].start();
        }
        for (Thread t : threads) t.join();
        if (c.getValue() != 5000) throw new RuntimeException("Fail 1");
        c.decrement();
        if (c.getValue() != 4999) throw new RuntimeException("Fail 2");
        c.reset();
        if (c.getValue() != 0) throw new RuntimeException("Fail 3");
        c.add(10);
        if (c.getValue() != 10) throw new RuntimeException("Fail 4");
        c.add(-5);
        if (c.getValue() != 5) throw new RuntimeException("Fail 5");
        if (c.getAndSet(100) != 5) throw new RuntimeException("Fail 6");
        if (c.getValue() != 100) throw new RuntimeException("Fail 7");
        if (!c.compareAndSet(100, 200)) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class CasCounter {
    private final AtomicInteger val = new AtomicInteger(0);
    public void increment() {
        while (true) {
            int current = val.get();
            if (val.compareAndSet(current, current + 1)) return;
        }
    }
    public void decrement() {
        while (true) {
            int current = val.get();
            if (val.compareAndSet(current, current - 1)) return;
        }
    }
    public void add(int delta) {
        while (true) {
            int current = val.get();
            if (val.compareAndSet(current, current + delta)) return;
        }
    }
    public int getValue() { return val.get(); }
    public void reset() { val.set(0); }
    public int getAndSet(int v) { return val.getAndSet(v); }
    public boolean compareAndSet(int exp, int up) { return val.compareAndSet(exp, up); }
}
`,
    expectedBigO: { time: 'O(1) CAS', space: 'O(1)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-conc-03',
    title: 'Deadlock-Free Resource Ordering Transfer',
    category: 'CONCURRENCY',
    prompt:
      'Transfer balance between two accounts without deadlock using global resource ordering (System.identityHashCode).',
    expectedConcepts: [
      'deadlock prevention',
      'lock ordering',
      'System.identityHashCode',
      'synchronized',
    ],
    testCode: `
public class Harness {
    public static void main(String[] args) throws Exception {
        Account a = new Account("A", 1000);
        Account b = new Account("B", 1000);
        Thread t1 = new Thread(() -> {
            for (int i = 0; i < 500; i++) Solution.transfer(a, b, 1);
        });
        Thread t2 = new Thread(() -> {
            for (int i = 0; i < 500; i++) Solution.transfer(b, a, 1);
        });
        t1.start(); t2.start();
        t1.join(); t2.join();
        if (a.getBalance() + b.getBalance() != 2000) throw new RuntimeException("Fail 1");
        if (a.getBalance() != 1000 || b.getBalance() != 1000) throw new RuntimeException("Fail 2");
        Solution.transfer(a, b, 100);
        if (a.getBalance() != 900 || b.getBalance() != 1100) throw new RuntimeException("Fail 3");
        try {
            Solution.transfer(a, b, 2000);
            throw new RuntimeException("Fail 4");
        } catch (IllegalArgumentException e) {}
        try {
            Solution.transfer(a, b, -50);
            throw new RuntimeException("Fail 5");
        } catch (IllegalArgumentException e) {}
        Solution.transfer(a, a, 10);
        if (a.getBalance() != 900) throw new RuntimeException("Fail 6");
        Solution.transfer(b, a, 100);
        if (a.getBalance() != 1000) throw new RuntimeException("Fail 7");
        if (b.getBalance() != 1000) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Account {
    final String id;
    int balance;
    Account(String id, int bal) { this.id = id; this.balance = bal; }
    int getBalance() { return balance; }
}
class Solution {
    private static final Object tieLock = new Object();
    public static void transfer(Account from, Account to, int amount) {
        if (from == to) return;
        if (amount <= 0) throw new IllegalArgumentException("Invalid amount");
        int fromHash = System.identityHashCode(from);
        int toHash = System.identityHashCode(to);
        if (fromHash < toHash) {
            synchronized (from) { synchronized (to) { doTransfer(from, to, amount); } }
        } else if (fromHash > toHash) {
            synchronized (to) { synchronized (from) { doTransfer(from, to, amount); } }
        } else {
            synchronized (tieLock) { synchronized (from) { synchronized (to) { doTransfer(from, to, amount); } } }
        }
    }
    private static void doTransfer(Account from, Account to, int amount) {
        if (from.balance < amount) throw new IllegalArgumentException("Insufficient");
        from.balance -= amount;
        to.balance += amount;
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-conc-04',
    title: 'Parallel Stream Associative Reduction',
    category: 'CONCURRENCY',
    prompt: 'Compute sum of squares on a large list using parallelStream() and custom accumulator.',
    expectedConcepts: ['parallelStream', 'reduce', 'associative operation', 'identity value'],
    testCode: `
import java.util.*;
public class Harness {
    public static void main(String[] args) {
        List<Integer> list = List.of(1, 2, 3, 4, 5);
        if (Solution.sumOfSquares(list) != 55) throw new RuntimeException("Fail 1");
        if (Solution.sumOfSquares(List.of()) != 0) throw new RuntimeException("Fail 2");
        if (Solution.sumOfSquares(List.of(10)) != 100) throw new RuntimeException("Fail 3");
        List<Integer> large = new ArrayList<>(1000);
        for (int i = 1; i <= 100; i++) large.add(i);
        long expected = 100L * 101 * 201 / 6;
        if (Solution.sumOfSquares(large) != expected) throw new RuntimeException("Fail 4");
        if (Solution.sumOfSquares(List.of(-1, -2, -3)) != 14) throw new RuntimeException("Fail 5");
        if (Solution.sumOfSquares(List.of(0, 0, 0)) != 0) throw new RuntimeException("Fail 6");
        if (Solution.sumOfSquares(List.of(2, 2)) != 8) throw new RuntimeException("Fail 7");
        if (Solution.sumOfSquares(List.of(3, 4)) != 25) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static long sumOfSquares(List<Integer> nums) {
        return nums.parallelStream()
            .mapToLong(x -> (long) x * x)
            .reduce(0L, Long::sum);
    }
}
`,
    expectedBigO: { time: 'O(n / cores)', space: 'O(log n)' },
    expectedVisualizer: 'array',
  },
  {
    id: 'golden-conc-05',
    title: 'CompletableFuture Asynchronous Pipeline with Fallback',
    category: 'CONCURRENCY',
    prompt: 'Compose async tasks with thenApplyAsync, exceptionally fallback, and join().',
    expectedConcepts: ['CompletableFuture', 'thenApplyAsync', 'exceptionally', 'join'],
    testCode: `
import java.util.concurrent.*;
public class Harness {
    public static void main(String[] args) {
        CompletableFuture<String> f1 = Solution.processAsync("hello");
        if (!"HELLO-DONE".equals(f1.join())) throw new RuntimeException("Fail 1");
        CompletableFuture<String> f2 = Solution.processAsync("");
        if (!"FALLBACK".equals(f2.join())) throw new RuntimeException("Fail 2");
        CompletableFuture<String> f3 = Solution.processAsync(null);
        if (!"FALLBACK".equals(f3.join())) throw new RuntimeException("Fail 3");
        CompletableFuture<String> f4 = Solution.combineAsync("foo", "bar");
        if (!"FOO:BAR".equals(f4.join())) throw new RuntimeException("Fail 4");
        if (f1.isDone() != true) throw new RuntimeException("Fail 5");
        if (f2.isDone() != true) throw new RuntimeException("Fail 6");
        if (f4.isDone() != true) throw new RuntimeException("Fail 7");
        CompletableFuture<String> f5 = Solution.processAsync("java");
        if (!"JAVA-DONE".equals(f5.join())) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class Solution {
    public static CompletableFuture<String> processAsync(String input) {
        return CompletableFuture.supplyAsync(() -> {
            if (input == null || input.isEmpty()) throw new IllegalArgumentException("Empty");
            return input.toUpperCase();
        }).thenApply(res -> res + "-DONE")
          .exceptionally(ex -> "FALLBACK");
    }
    public static CompletableFuture<String> combineAsync(String s1, String s2) {
        CompletableFuture<String> f1 = CompletableFuture.supplyAsync(() -> s1.toUpperCase());
        CompletableFuture<String> f2 = CompletableFuture.supplyAsync(() -> s2.toUpperCase());
        return f1.thenCombine(f2, (a, b) -> a + ":" + b);
    }
}
`,
    expectedBigO: { time: 'O(1) async', space: 'O(1)' },
    expectedVisualizer: 'graph',
  },
  {
    id: 'golden-conc-06',
    title: 'Java 21 Virtual Threads Execution',
    category: 'CONCURRENCY',
    prompt: 'Spawn 1000 virtual threads using Thread.ofVirtual() and collect concurrent results.',
    expectedConcepts: ['Thread.ofVirtual()', 'Virtual Threads', 'unpinned carrier thread', 'join'],
    testCode: `
import java.util.concurrent.atomic.AtomicInteger;
public class Harness {
    public static void main(String[] args) throws Exception {
        AtomicInteger counter = new AtomicInteger(0);
        int total = 1000;
        Thread[] vThreads = new Thread[total];
        for (int i = 0; i < total; i++) {
            vThreads[i] = Thread.ofVirtual().name("vt-", i).start(() -> {
                counter.incrementAndGet();
            });
        }
        for (Thread t : vThreads) {
            t.join();
        }
        if (counter.get() != total) throw new RuntimeException("Fail 1");
        if (!vThreads[0].isVirtual()) throw new RuntimeException("Fail 2");
        if (!vThreads[total - 1].isVirtual()) throw new RuntimeException("Fail 3");
        Thread platform = new Thread(() -> {});
        if (platform.isVirtual()) throw new RuntimeException("Fail 4");
        Thread.Builder.OfVirtual builder = Thread.ofVirtual().name("test-vt");
        Thread tSingle = builder.start(() -> counter.addAndGet(10));
        tSingle.join();
        if (counter.get() != total + 10) throw new RuntimeException("Fail 5");
        if (!tSingle.getName().equals("test-vt")) throw new RuntimeException("Fail 6");
        if (vThreads.length != 1000) throw new RuntimeException("Fail 7");
        if (tSingle.isAlive()) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
`,
    expectedBigO: { time: 'O(n / vthreads)', space: 'O(n)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
  {
    id: 'golden-conc-07',
    title: 'ReadWriteLock Cached Repository Pattern',
    category: 'CONCURRENCY',
    prompt:
      'Implement a concurrent cache with ReentrantReadWriteLock allowing multiple concurrent readers and exclusive writers.',
    expectedConcepts: [
      'ReentrantReadWriteLock',
      'readLock()',
      'writeLock()',
      'lock upgrade/downgrade',
    ],
    testCode: `
import java.util.*;
import java.util.concurrent.locks.*;
public class Harness {
    public static void main(String[] args) {
        ConcurrentCache<String, String> cache = new ConcurrentCache<>();
        cache.put("k1", "v1");
        if (!"v1".equals(cache.get("k1"))) throw new RuntimeException("Fail 1");
        if (cache.get("k2") != null) throw new RuntimeException("Fail 2");
        cache.put("k2", "v2");
        if (cache.size() != 2) throw new RuntimeException("Fail 3");
        cache.remove("k1");
        if (cache.get("k1") != null) throw new RuntimeException("Fail 4");
        if (cache.size() != 1) throw new RuntimeException("Fail 5");
        cache.clear();
        if (cache.size() != 0) throw new RuntimeException("Fail 6");
        if (cache.containsKey("k2")) throw new RuntimeException("Fail 7");
        cache.put("a", "b");
        if (!cache.containsKey("a")) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class ConcurrentCache<K, V> {
    private final Map<K, V> map = new HashMap<>();
    private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
    private final Lock r = rw.readLock(), w = rw.writeLock();
    public V get(K key) {
        r.lock();
        try { return map.get(key); } finally { r.unlock(); }
    }
    public void put(K key, V val) {
        w.lock();
        try { map.put(key, val); } finally { w.unlock(); }
    }
    public V remove(K key) {
        w.lock();
        try { return map.remove(key); } finally { w.unlock(); }
    }
    public int size() {
        r.lock();
        try { return map.size(); } finally { r.unlock(); }
    }
    public boolean containsKey(K key) {
        r.lock();
        try { return map.containsKey(key); } finally { r.unlock(); }
    }
    public void clear() {
        w.lock();
        try { map.clear(); } finally { w.unlock(); }
    }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(n)' },
    expectedVisualizer: 'hash_table',
  },
  {
    id: 'golden-conc-08',
    title: 'Semaphore Resource Limiter',
    category: 'CONCURRENCY',
    prompt:
      'Throttle access to a pool of 3 database connections using Semaphore acquire() and release().',
    expectedConcepts: ['Semaphore', 'permits', 'acquire()', 'release() in finally'],
    testCode: `
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
public class Harness {
    public static void main(String[] args) throws Exception {
        ConnectionLimiter limiter = new ConnectionLimiter(3);
        AtomicInteger active = new AtomicInteger(0);
        AtomicInteger maxObserved = new AtomicInteger(0);
        Thread[] threads = new Thread[6];
        for (int i = 0; i < threads.length; i++) {
            threads[i] = new Thread(() -> {
                try {
                    limiter.executeWithConnection(() -> {
                        int cur = active.incrementAndGet();
                        maxObserved.updateAndGet(m -> Math.max(m, cur));
                        try { Thread.sleep(25); } catch (InterruptedException ignored) {}
                        active.decrementAndGet();
                    });
                } catch (Exception ignored) {}
            });
            threads[i].start();
        }
        for (Thread t : threads) t.join();
        if (maxObserved.get() > 3) throw new RuntimeException("Fail 1");
        if (active.get() != 0) throw new RuntimeException("Fail 2");
        if (limiter.availablePermits() != 3) throw new RuntimeException("Fail 3");
        limiter.executeWithConnection(() -> {});
        if (limiter.availablePermits() != 3) throw new RuntimeException("Fail 4");
        try {
            new ConnectionLimiter(0);
            throw new RuntimeException("Fail 5");
        } catch (IllegalArgumentException e) {}
        try {
            new ConnectionLimiter(-1);
            throw new RuntimeException("Fail 6");
        } catch (IllegalArgumentException e) {}
        if (maxObserved.get() < 1) throw new RuntimeException("Fail 7");
        if (threads.length != 6) throw new RuntimeException("Fail 8");
        System.out.println("PASS");
    }
}
class ConnectionLimiter {
    private final Semaphore sem;
    public ConnectionLimiter(int maxConcurrent) {
        if (maxConcurrent <= 0) throw new IllegalArgumentException("Must be positive");
        this.sem = new Semaphore(maxConcurrent);
    }
    public void executeWithConnection(Runnable task) throws InterruptedException {
        sem.acquire();
        try {
            task.run();
        } finally {
            sem.release();
        }
    }
    public int availablePermits() { return sem.availablePermits(); }
}
`,
    expectedBigO: { time: 'O(1)', space: 'O(1)' },
    expectedVisualizer: 'jvm_memory_2d',
  },
];
