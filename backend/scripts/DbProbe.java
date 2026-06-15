import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;

public class DbProbe {
  public static void main(String[] args) throws Exception {
    String url =
        "jdbc:mysql://wemove.clmemu0k8ww2.ap-northeast-2.rds.amazonaws.com:3306/wemove?connectionTimeZone=Asia/Seoul&serverTimezone=Asia/Seoul&characterEncoding=UTF-8";
    String user = "admin";
    String password = "root1234";

    try (Connection connection = DriverManager.getConnection(url, user, password);
        Statement statement = connection.createStatement()) {
      printTables(statement);
      printColumns(statement, "regions");
      printColumns(statement, "users");
      printColumns(statement, "meetings");
      printColumns(statement, "sports");
      printColumns(statement, "reports");
      printColumnsIfExists(statement, "meeting_participants");
      printColumnsIfExists(statement, "participants");
      printColumnsIfExists(statement, "meetingParticipants");
      printSample(statement, "SELECT * FROM regions LIMIT 3");
    }
  }

  private static void printTables(Statement statement) throws Exception {
    System.out.println("== TABLES ==");
    try (ResultSet rs = statement.executeQuery("SHOW TABLES")) {
      while (rs.next()) {
        System.out.println(rs.getString(1));
      }
    }
  }

  private static void printColumns(Statement statement, String tableName) throws Exception {
    System.out.println("== COLUMNS: " + tableName + " ==");
    try (ResultSet rs = statement.executeQuery("SHOW COLUMNS FROM " + tableName)) {
      while (rs.next()) {
        System.out.println(rs.getString("Field") + " | " + rs.getString("Type"));
      }
    }
  }

  private static void printColumnsIfExists(Statement statement, String tableName) throws Exception {
    try {
      printColumns(statement, tableName);
    } catch (Exception ignored) {
      System.out.println("== MISSING: " + tableName + " ==");
    }
  }

  private static void printSample(Statement statement, String sql) throws Exception {
    System.out.println("== SAMPLE ==");
    try (ResultSet rs = statement.executeQuery(sql)) {
      ResultSetMetaData meta = rs.getMetaData();
      int count = meta.getColumnCount();

      while (rs.next()) {
        for (int index = 1; index <= count; index += 1) {
          System.out.print(meta.getColumnLabel(index) + "=" + rs.getString(index));
          if (index < count) {
            System.out.print(", ");
          }
        }
        System.out.println();
      }
    }
  }
}
