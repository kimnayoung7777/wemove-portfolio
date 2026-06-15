import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class DbTables {
  public static void main(String[] args) throws Exception {
    String url =
        "jdbc:mysql://wemove.clmemu0k8ww2.ap-northeast-2.rds.amazonaws.com:3306/wemove?connectionTimeZone=Asia/Seoul&serverTimezone=Asia/Seoul&characterEncoding=UTF-8";
    String user = "admin";
    String password = "root1234";

    try (Connection connection = DriverManager.getConnection(url, user, password);
        Statement statement = connection.createStatement();
        ResultSet rs = statement.executeQuery("SHOW TABLES")) {
      while (rs.next()) {
        System.out.println(rs.getString(1));
      }
    }
  }
}
