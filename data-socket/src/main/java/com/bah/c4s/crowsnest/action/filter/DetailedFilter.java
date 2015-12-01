package com.bah.c4s.crowsnest.action.filter;

import org.json.simple.JSONObject;

import com.bah.c4s.crowsnest.action.ActionUtils;
import com.bah.c4s.crowsnest.action.ActionResponse;


public class DetailedFilter extends Filter {

	
	public DetailedFilter(JSONObject actionDefinition) throws Exception{
		super(actionDefinition);
		this.subChecks = ActionUtils.getFilters(actionDefinition);
	}
	
	@Override
	public ActionResponse process(JSONObject json, String dataSource) {
		if(this.source.equals(dataSource) && ActionUtils.detailedExamine(json, subChecks)){
			return this.type;
		} else{
			return ActionResponse.NONE;
		}
	}
	
	public void addSubFilter(String filter){
		this.subChecks.add(filter);
	}

	@Override
	public String getEntity() {
		return ActionUtils.detailedEntity(this.subChecks);
	}

	@Override
	public String getEntityDescription() {
		return ActionUtils.detailedEntityDescription(this.subChecks);
	}

}
