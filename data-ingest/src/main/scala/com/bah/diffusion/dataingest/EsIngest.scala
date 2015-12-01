package com.bah.diffusion.dataingest

import com.sksamuel.elastic4s.ElasticDsl._
import com.sksamuel.elastic4s.mappings.FieldType.StringType
import com.sksamuel.elastic4s.ElasticClient
import com.sksamuel.elastic4s.StopAnalyzer
import com.sksamuel.elastic4s.SimpleAnalyzer
import com.sksamuel.elastic4s.SnowballAnalyzer
import com.sksamuel.elastic4s.StandardTokenizer
import com.sksamuel.elastic4s.LowercaseTokenizer
import com.sksamuel.elastic4s.WhitespaceAnalyzer
import com.sksamuel.elastic4s.CustomAnalyzerDefinition
import com.sksamuel.elastic4s.StemmerTokenFilter
import com.sksamuel.elastic4s.EdgeNGramTokenizer
import com.sksamuel.elastic4s.EdgeNGramTokenFilter
import com.sksamuel.elastic4s.NGramTokenFilter
import com.sksamuel.elastic4s.NGramTokenizer
import com.sksamuel.elastic4s.mappings.FieldType.MultiFieldType
import com.sksamuel.elastic4s.mappings.FieldType.BooleanType
import com.sksamuel.elastic4s.mappings.FieldType.ShortType
import com.sksamuel.elastic4s.mappings.MultiFieldDefinition
import org.elasticsearch.indices.IndexMissingException
import org.elasticsearch.common.joda.convert.ToString
import scala.sys.process._
import org.elasticsearch.common.settings.ImmutableSettings

object EsIngest {

  def ingest(arg: String) {

    val client = ElasticClient.remote("localhost", 9300)
    /*val settings = ImmutableSettings.settingsBuilder()
      .put("http.enabled", false)
    val client = ElasticClient.local(settings.build())
    */
    
    //Check on the current index
    try {
      val req = client.execute { status("item_test") }.await
      client.execute { delete index "item_test" }.await
    } catch {
      case e: IndexMissingException => println("Index Missing Exception caught: " + e);
    }

    //Rebuild the mapping
    val resp = client.execute {
      create index "item_test" shards 1 replicas 0 refreshInterval "10s" mappings {
        "item_entity" as (
          "predicateType" typed BooleanType index "no",
          "concept" typed StringType analyzer "myAnalyzer1",
          "label" typed StringType analyzer "myAnalyzer1",
          "NAME" typed StringType analyzer WhitespaceAnalyzer,
          "state" typed ShortType,
          "county" typed ShortType,
          "accumuloId" typed StringType index "not_analyzed",
          "concept" typed MultiFieldType as (
            "concept" typed StringType analyzer "myAnalyzer1",
            "raw" typed StringType index "not_analyzed"))
      } analysis (
        CustomAnalyzerDefinition("myAnalyzer1",
          LowercaseTokenizer,
          //StemmerTokenFilter("myStemmerTokenFilter", lang = "light_english"),
          //EdgeNGramTokenFilter("myEdgeNGramTokenFilter", minGram = 3, maxGram = 10),
          NGramTokenFilter("myNGramTokenFilter", minGram = 3, maxGram = 15)))
    }.await
    
    println(resp.isAcknowledged())
    
    val cmd = f"curl -XPUT localhost:9200/_bulk --data-binary @$arg%s"
    val output = cmd.!! // Captures the output

    println(output)
    
  }
}