package kr.co.iei.search.model.service;

import java.util.List;

public interface SearchService {
  void recordKeyword(String keyword, String actorKey);

  List<String> getPopularKeywords(int limit);
}
